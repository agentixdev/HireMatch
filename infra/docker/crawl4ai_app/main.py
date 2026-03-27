"""
Crawl4AI FastAPI service — deep web crawling for recruitment data extraction.
Provides endpoints for crawling job boards, company pages, and visa information.
"""

import os
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, HttpUrl
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="HireMatch Crawl4AI Service",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
)

security = HTTPBearer()
API_TOKEN = os.environ.get("CRAWL4AI_API_TOKEN", "")

BRIGHT_DATA_HOST = os.environ.get("BRIGHT_DATA_HOST", "")
BRIGHT_DATA_PORT = os.environ.get("BRIGHT_DATA_PORT", "22225")
BRIGHT_DATA_USER = os.environ.get("BRIGHT_DATA_USER", "")
BRIGHT_DATA_PASS = os.environ.get("BRIGHT_DATA_PASS", "")


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    if not API_TOKEN or credentials.credentials != API_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")
    return credentials


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


@app.get("/health")
async def health():
    return {"status": "ok", "service": "crawl4ai"}


@app.post("/crawl", response_model=CrawlResponse)
async def crawl(req: CrawlRequest, _=Depends(verify_token)):
    """Crawl a URL and return extracted content."""
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
