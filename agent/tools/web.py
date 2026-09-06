"""ORBIT Agent - Web search and content tools."""

from __future__ import annotations

import logging
import re
from urllib.parse import quote_plus

import httpx

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}


async def search_web(query: str, num_results: int = 5) -> dict:
    """Search the web via DuckDuckGo HTML and parse results."""
    try:
        url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers=HEADERS)
            resp.raise_for_status()

        html = resp.text
        results = []

        # Parse result blocks
        blocks = re.findall(
            r'<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)</a>.*?'
            r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>',
            html,
            re.DOTALL,
        )

        for href, title, snippet in blocks[:num_results]:
            # Clean HTML tags
            title = re.sub(r"<[^>]+>", "", title).strip()
            snippet = re.sub(r"<[^>]+>", "", snippet).strip()
            # Decode DuckDuckGo redirect URL
            if "uddg=" in href:
                href = href.split("uddg=")[1].split("&")[0]
            results.append({"title": title, "url": href, "snippet": snippet})

        return {"query": query, "results": results, "count": len(results)}
    except Exception as e:
        logger.exception("search_web failed")
        return {"error": str(e), "query": query}


async def open_website(url: str) -> dict:
    """Fetch a URL and return its text content."""
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers=HEADERS)
            resp.raise_for_status()

        html = resp.text

        # Simple HTML to text
        text = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL)
        text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text).strip()

        # Truncate to 5000 chars
        if len(text) > 5000:
            text = text[:5000] + "..."

        return {"url": url, "content": text, "status": "ok"}
    except Exception as e:
        logger.exception("open_website failed")
        return {"error": str(e), "url": url}
