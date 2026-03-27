"""
Crawl4AI wrapper — crawls URLs and extracts structured data via Gemini.
"""

import asyncio
import hashlib
import logging
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import Optional

import httpx
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

from app.extractor import ExtractionType, extract

logger = logging.getLogger("crawl4ai.crawler")

# ─── Types ───


@dataclass
class CrawlResult:
    """Result from a single URL crawl."""

    url: str
    data: dict | list | None = None
    raw_text: str | None = None
    content_hash: str | None = None
    error: str | None = None


# ─── Browser config ───

_browser_config = BrowserConfig(
    headless=True,
    verbose=False,
    extra_args=[
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
    ],
)


def _compute_hash(text: str) -> str:
    """Compute SHA-256 hash of normalised text for deduplication."""
    normalised = " ".join(text.lower().split())
    return hashlib.sha256(normalised.encode("utf-8")).hexdigest()


# ─── Single URL crawl ───


async def crawl_url(
    url: str,
    extraction_type: ExtractionType,
    country: Optional[str] = None,
    timeout: int = 30,
    wait_for_selector: Optional[str] = None,
    js_code: Optional[str] = None,
) -> CrawlResult:
    """
    Crawl a single URL and extract structured data.

    Uses Crawl4AI for rendering + content extraction, then Gemini for
    structured data extraction from the cleaned text.

    Args:
        url: The URL to crawl
        extraction_type: Type of data to extract (visa, job, candidate)
        country: Country code (required for visa extraction)
        timeout: Page load timeout in seconds
        wait_for_selector: Optional CSS selector to wait for
        js_code: Optional JavaScript to execute before extraction

    Returns:
        CrawlResult with extracted data or error
    """
    try:
        crawler_config = CrawlerRunConfig(
            wait_until="domcontentloaded",
            page_timeout=timeout * 1000,
            wait_for=wait_for_selector if wait_for_selector else None,
            js_code=js_code if js_code else None,
            remove_overlay_elements=True,
            exclude_external_links=True,
            process_iframes=False,
        )

        async with AsyncWebCrawler(config=_browser_config) as crawler:
            result = await crawler.arun(url=url, config=crawler_config)

        if not result.success:
            error_msg = getattr(result, "error_message", "Unknown crawl error")
            logger.warning("Crawl failed for %s: %s", url, error_msg)
            return CrawlResult(url=url, error=str(error_msg))

        # Get the cleaned markdown/text content
        raw_text = result.markdown or result.cleaned_html or ""

        if not raw_text.strip():
            logger.warning("No content extracted from %s", url)
            return CrawlResult(url=url, error="No content extracted")

        content_hash = _compute_hash(raw_text)

        # Extract structured data using Gemini
        extracted = await extract(
            html=raw_text,
            extraction_type=extraction_type,
            country=country,
        )

        logger.info(
            "Successfully crawled and extracted: url=%s type=%s hash=%s",
            url,
            extraction_type.value,
            content_hash[:12],
        )

        return CrawlResult(
            url=url,
            data=extracted,
            raw_text=raw_text[:10000],  # Truncate for storage
            content_hash=content_hash,
        )

    except Exception as exc:
        logger.exception("Crawl error for %s", url)
        return CrawlResult(url=url, error=str(exc))


# ─── Sitemap crawl ───


async def crawl_sitemap(
    sitemap_url: str,
    extraction_type: ExtractionType,
    country: Optional[str] = None,
    max_pages: int = 50,
    timeout_per_page: int = 30,
) -> list[CrawlResult]:
    """
    Discover and crawl all pages from a sitemap.

    Supports standard XML sitemaps and sitemap index files.
    Crawls pages concurrently with a concurrency limit.

    Args:
        sitemap_url: URL of the sitemap XML
        extraction_type: Type of data to extract
        country: Country code for visa extraction
        max_pages: Maximum number of pages to crawl
        timeout_per_page: Timeout per page in seconds

    Returns:
        List of CrawlResult for each discovered page
    """
    # Fetch and parse the sitemap
    urls = await _discover_sitemap_urls(sitemap_url, max_pages)

    if not urls:
        logger.warning("No URLs found in sitemap: %s", sitemap_url)
        return [CrawlResult(url=sitemap_url, error="No URLs found in sitemap")]

    logger.info("Discovered %d URLs from sitemap %s", len(urls), sitemap_url)

    # Crawl concurrently with semaphore to limit parallelism
    semaphore = asyncio.Semaphore(5)  # max 5 concurrent crawls

    async def crawl_with_limit(url: str) -> CrawlResult:
        async with semaphore:
            return await crawl_url(
                url=url,
                extraction_type=extraction_type,
                country=country,
                timeout=timeout_per_page,
            )

    tasks = [crawl_with_limit(url) for url in urls[:max_pages]]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Convert exceptions to CrawlResult errors
    final_results: list[CrawlResult] = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            final_results.append(
                CrawlResult(url=urls[i], error=str(result))
            )
        else:
            final_results.append(result)

    return final_results


async def _discover_sitemap_urls(sitemap_url: str, max_urls: int) -> list[str]:
    """
    Fetch and parse a sitemap XML, returning all page URLs.
    Handles both regular sitemaps and sitemap index files.
    """
    urls: list[str] = []

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=30.0,
            headers={"User-Agent": "HireMatch-Crawler/1.0"},
        ) as client:
            response = await client.get(sitemap_url)
            response.raise_for_status()

            content = response.text

        # Parse XML
        root = ET.fromstring(content)

        # Handle namespace
        ns = ""
        if root.tag.startswith("{"):
            ns = root.tag.split("}")[0] + "}"

        # Check if this is a sitemap index
        sitemap_tags = root.findall(f"{ns}sitemap")
        if sitemap_tags:
            # Sitemap index — recursively fetch child sitemaps
            logger.info(
                "Found sitemap index with %d child sitemaps", len(sitemap_tags)
            )
            for sitemap_tag in sitemap_tags:
                loc = sitemap_tag.find(f"{ns}loc")
                if loc is not None and loc.text:
                    child_urls = await _discover_sitemap_urls(
                        loc.text.strip(), max_urls - len(urls)
                    )
                    urls.extend(child_urls)
                    if len(urls) >= max_urls:
                        break
        else:
            # Regular sitemap — extract URLs
            url_tags = root.findall(f"{ns}url")
            for url_tag in url_tags:
                loc = url_tag.find(f"{ns}loc")
                if loc is not None and loc.text:
                    urls.append(loc.text.strip())
                    if len(urls) >= max_urls:
                        break

    except httpx.HTTPError as exc:
        logger.error("Failed to fetch sitemap %s: %s", sitemap_url, exc)
    except ET.ParseError as exc:
        logger.error("Failed to parse sitemap XML %s: %s", sitemap_url, exc)
    except Exception as exc:
        logger.exception("Error discovering sitemap URLs from %s", sitemap_url)

    return urls[:max_urls]
