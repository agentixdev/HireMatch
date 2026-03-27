"""
Crawl4AI FastAPI service — deep web crawling for recruitment data extraction.
Provides endpoints for crawling job boards, company pages, visa information,
and candidate profiles. Uses Gemini LLM for structured data extraction.
"""

import os
import time
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, HttpUrl, Field
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode

from app.crawler import crawl_url, crawl_sitemap, CrawlResult as StructuredCrawlResult
from app.extractor import ExtractionType

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper()),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="HireMatch Crawl4AI Service",
    description="Crawls URLs and extracts structured recruitment data using Gemini LLM",
    version="1.0.0",
)

security = HTTPBearer(auto_error=False)
API_TOKEN = os.environ.get("CRAWL4AI_API_TOKEN", "")

BRIGHT_DATA_HOST = os.environ.get("BRIGHT_DATA_HOST", "")
BRIGHT_DATA_PORT = os.environ.get("BRIGHT_DATA_PORT", "22225")
BRIGHT_DATA_USER = os.environ.get("BRIGHT_DATA_USER", "")
BRIGHT_DATA_PASS = os.environ.get("BRIGHT_DATA_PASS", "")

_start_time = time.time()


def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)):
    if API_TOKEN and (not credentials or credentials.credentials != API_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid token")
    return credentials


# ─── Request / Response models ───


class CrawlRequest(BaseModel):
    url: HttpUrl
    wait_for: Optional[str] = None
    css_selector: Optional[str] = None
    use_proxy: bool = False
    extract_schema: Optional[dict] = None
    cache_mode: str = "bypass"
    timeout: int = 60000


class CrawlResponse(BaseModel):
    success: bool
    url: str
    html: Optional[str] = None
    markdown: Optional[str] = None
    extracted_content: Optional[str] = None
    metadata: Optional[dict] = None
    error: Optional[str] = None


class ExtractCrawlRequest(BaseModel):
    url: HttpUrl
    extraction_type: ExtractionType = ExtractionType.JOB
    country: Optional[str] = Field(None, description="Country code for visa extraction")
    timeout: int = Field(30, ge=5, le=120, description="Timeout in seconds")
    wait_for_selector: Optional[str] = Field(
        None, description="CSS selector to wait for before extraction"
    )
    js_code: Optional[str] = Field(
        None, description="JavaScript to execute before extraction"
    )


class ExtractCrawlResponse(BaseModel):
    success: bool
    url: str
    extraction_type: str
    data: dict | list | None = None
    raw_text: str | None = None
    content_hash: str | None = None
    duration_ms: int
    error: str | None = None


class SitemapRequest(BaseModel):
    sitemap_url: HttpUrl
    extraction_type: ExtractionType = ExtractionType.JOB
    country: Optional[str] = None
    max_pages: int = Field(50, ge=1, le=500)
    timeout_per_page: int = Field(30, ge=5, le=120)


class SitemapResponse(BaseModel):
    success: bool
    sitemap_url: str
    pages_found: int
    pages_crawled: int
    pages_failed: int
    results: list[ExtractCrawlResponse]
    duration_ms: int


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    uptime_seconds: float
    gemini_configured: bool


# ─── Health ───


@app.get("/health", response_model=HealthResponse)
async def health():
    gemini_key = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
    return HealthResponse(
        status="healthy",
        service="crawl4ai",
        version="1.0.0",
        uptime_seconds=round(time.time() - _start_time, 2),
        gemini_configured=bool(gemini_key),
    )


# ─── Raw crawl (original) ───


@app.post("/crawl", response_model=CrawlResponse)
async def crawl(req: CrawlRequest, _=Depends(verify_token)):
    """Crawl a URL and return extracted content (raw HTML/markdown)."""
    proxy = None
    if req.use_proxy and BRIGHT_DATA_HOST:
        proxy = f"http://{BRIGHT_DATA_USER}:{BRIGHT_DATA_PASS}@{BRIGHT_DATA_HOST}:{BRIGHT_DATA_PORT}"

    browser_config = BrowserConfig(
        headless=True,
        proxy=proxy,
        viewport_width=1280,
        viewport_height=800,
    )

    cache_mode_map = {
        "bypass": CacheMode.BYPASS,
        "read": CacheMode.READ_ONLY,
        "write": CacheMode.WRITE_ONLY,
        "enabled": CacheMode.ENABLED,
    }

    crawler_config = CrawlerRunConfig(
        wait_for=req.wait_for,
        css_selector=req.css_selector,
        cache_mode=cache_mode_map.get(req.cache_mode, CacheMode.BYPASS),
        page_timeout=req.timeout,
    )

    try:
        async with AsyncWebCrawler(config=browser_config) as crawler:
            result = await crawler.arun(url=str(req.url), config=crawler_config)

            if not result.success:
                return CrawlResponse(
                    success=False,
                    url=str(req.url),
                    error=result.error_message or "Crawl failed",
                )

            return CrawlResponse(
                success=True,
                url=str(req.url),
                html=result.html[:500_000] if result.html else None,
                markdown=result.markdown[:200_000] if result.markdown else None,
                extracted_content=result.extracted_content,
                metadata=result.metadata if hasattr(result, "metadata") else None,
            )
    except Exception as e:
        logger.exception("Crawl error for %s", req.url)
        raise HTTPException(status_code=500, detail=str(e))


# ─── Structured extraction crawl (new) ───


@app.post("/crawl/extract", response_model=ExtractCrawlResponse)
async def crawl_extract(request: ExtractCrawlRequest, _=Depends(verify_token)):
    """
    Crawl a URL and extract structured data using Gemini LLM.

    Supported extraction types:
    - visa: Extract visa/immigration rules (requires country)
    - job: Extract job posting data
    - candidate: Extract candidate/profile data
    """
    start = time.time()

    try:
        result: StructuredCrawlResult = await crawl_url(
            url=str(request.url),
            extraction_type=request.extraction_type,
            country=request.country,
            timeout=request.timeout,
            wait_for_selector=request.wait_for_selector,
            js_code=request.js_code,
        )

        duration_ms = int((time.time() - start) * 1000)

        if result.error:
            logger.warning(
                "Extract crawl failed: url=%s error=%s duration=%dms",
                request.url,
                result.error,
                duration_ms,
            )
            return ExtractCrawlResponse(
                success=False,
                url=str(request.url),
                extraction_type=request.extraction_type.value,
                error=result.error,
                duration_ms=duration_ms,
            )

        logger.info(
            "Extract crawl success: url=%s type=%s duration=%dms",
            request.url,
            request.extraction_type.value,
            duration_ms,
        )

        return ExtractCrawlResponse(
            success=True,
            url=str(request.url),
            extraction_type=request.extraction_type.value,
            data=result.data,
            raw_text=result.raw_text,
            content_hash=result.content_hash,
            duration_ms=duration_ms,
        )

    except Exception as exc:
        duration_ms = int((time.time() - start) * 1000)
        logger.exception("Extract crawl error: url=%s", request.url)
        raise HTTPException(status_code=500, detail=str(exc))


# ─── Sitemap crawl ───


@app.post("/crawl/sitemap", response_model=SitemapResponse)
async def crawl_sitemap_endpoint(request: SitemapRequest, _=Depends(verify_token)):
    """
    Discover and crawl all pages from a sitemap URL.
    Extracts structured data from each discovered page.
    """
    start = time.time()

    try:
        results = await crawl_sitemap(
            sitemap_url=str(request.sitemap_url),
            extraction_type=request.extraction_type,
            country=request.country,
            max_pages=request.max_pages,
            timeout_per_page=request.timeout_per_page,
        )

        duration_ms = int((time.time() - start) * 1000)
        pages_crawled = sum(1 for r in results if r.data is not None)
        pages_failed = sum(1 for r in results if r.error is not None)

        response_results = [
            ExtractCrawlResponse(
                success=r.data is not None,
                url=r.url,
                extraction_type=request.extraction_type.value,
                data=r.data,
                raw_text=r.raw_text,
                content_hash=r.content_hash,
                duration_ms=0,
                error=r.error,
            )
            for r in results
        ]

        logger.info(
            "Sitemap crawl complete: url=%s found=%d crawled=%d failed=%d duration=%dms",
            request.sitemap_url,
            len(results),
            pages_crawled,
            pages_failed,
            duration_ms,
        )

        return SitemapResponse(
            success=True,
            sitemap_url=str(request.sitemap_url),
            pages_found=len(results),
            pages_crawled=pages_crawled,
            pages_failed=pages_failed,
            results=response_results,
            duration_ms=duration_ms,
        )

    except Exception as exc:
        duration_ms = int((time.time() - start) * 1000)
        logger.exception("Sitemap crawl error: url=%s", request.sitemap_url)
        raise HTTPException(status_code=500, detail=str(exc))


# ─── Batch crawl (original) ───


@app.post("/crawl/batch", response_model=list[CrawlResponse])
async def crawl_batch(requests: list[CrawlRequest], _=Depends(verify_token)):
    """Crawl multiple URLs sequentially."""
    results = []
    for req in requests[:20]:  # Max 20 URLs per batch
        try:
            result = await crawl(req, _)
            results.append(result)
        except HTTPException as e:
            results.append(
                CrawlResponse(
                    success=False,
                    url=str(req.url),
                    error=str(e.detail),
                )
            )
    return results


# ─── Main ───

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8100")),
        reload=os.getenv("RELOAD", "false").lower() == "true",
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )
