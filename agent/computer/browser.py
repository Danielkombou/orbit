"""ORBIT Computer - Browser automation via Playwright with full control."""

from __future__ import annotations

import base64
import logging
from typing import Any

from playwright.async_api import async_playwright, Browser, Page, Playwright

logger = logging.getLogger(__name__)


class BrowserComputer:
    """Full browser automation: tabs, navigation, mouse, keyboard, screenshots."""

    def __init__(self):
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None
        self._page: Page | None = None
        self._context = None

    @property
    def _current_page(self) -> Page | None:
        return self._page

    async def launch(self) -> dict:
        """Launch the browser."""
        if self._browser:
            return {"status": "already_running"}

        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(headless=True)
        self._context = await self._browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        self._page = await self._context.new_page()
        logger.info("Browser launched")
        return {"status": "launched", "viewport": {"width": 1280, "height": 720}}

    async def _ensure_page(self) -> Page:
        if not self._page:
            await self.launch()
        return self._page

    # ─── Navigation ───────────────────────────────────────────────

    async def navigate(self, url: str) -> dict:
        """Navigate to a URL."""
        page = await self._ensure_page()
        response = await page.goto(url, wait_until="domcontentloaded")
        return {
            "url": page.url,
            "title": await page.title(),
            "status": response.status if response else None,
        }

    async def go_back(self) -> dict:
        page = await self._ensure_page()
        await page.go_back()
        return {"url": page.url, "title": await page.title()}

    async def go_forward(self) -> dict:
        page = await self._ensure_page()
        await page.go_forward()
        return {"url": page.url, "title": await page.title()}

    async def reload(self) -> dict:
        page = await self._ensure_page()
        await page.reload()
        return {"url": page.url, "title": await page.title()}

    # ─── Tabs ─────────────────────────────────────────────────────

    async def new_tab(self, url: str = "about:blank") -> dict:
        """Open a new tab."""
        if not self._browser:
            await self.launch()
        page = await self._context.new_page()
        if url != "about:blank":
            await page.goto(url, wait_until="domcontentloaded")
        self._page = page
        return {"url": page.url, "title": await page.title(), "tab_count": len(self._context.pages)}

    async def close_tab(self, index: int | None = None) -> dict:
        """Close a tab by index (or current tab)."""
        if not self._context:
            return {"error": "No context"}
        pages = self._context.pages
        if not pages:
            return {"error": "No tabs"}
        idx = index if index is not None else len(pages) - 1
        idx = min(idx, len(pages) - 1)
        await pages[idx].close()
        if self._context.pages:
            self._page = self._context.pages[-1]
        return {"closed_tab": idx, "tab_count": len(self._context.pages)}

    async def switch_tab(self, index: int) -> dict:
        """Switch to a tab by index."""
        if not self._context:
            return {"error": "No context"}
        pages = self._context.pages
        if index >= len(pages):
            return {"error": f"Tab index {index} out of range"}
        self._page = pages[index]
        return {"url": self._page.url, "title": await self._page.title(), "tab_index": index}

    async def list_tabs(self) -> dict:
        """List all open tabs."""
        if not self._context:
            return {"tabs": [], "active": 0}
        tabs = []
        active = 0
        for i, p in enumerate(self._context.pages):
            tabs.append({"index": i, "url": p.url, "title": await p.title()})
            if p == self._page:
                active = i
        return {"tabs": tabs, "active": active}

    # ─── Interaction ──────────────────────────────────────────────

    async def click(self, selector: str) -> dict:
        page = await self._ensure_page()
        await page.click(selector)
        return {"selector": selector, "clicked": True}

    async def type_text(self, selector: str, text: str) -> dict:
        page = await self._ensure_page()
        await page.fill(selector, text)
        return {"selector": selector, "typed": text}

    async def press(self, key: str) -> dict:
        page = await self._ensure_page()
        await page.keyboard.press(key)
        return {"key": key, "pressed": True}

    async def mouse_move(self, x: int, y: int) -> dict:
        page = await self._ensure_page()
        await page.mouse.move(x, y)
        return {"x": x, "y": y, "moved": True}

    async def mouse_click(self, x: int, y: int, button: str = "left") -> dict:
        page = await self._ensure_page()
        await page.mouse.click(x, y, button=button)
        return {"x": x, "y": y, "button": button, "clicked": True}

    async def mouse_scroll(self, x: int, y: int, delta_x: int, delta_y: int) -> dict:
        page = await self._ensure_page()
        await page.mouse.move(x, y)
        await page.mouse.wheel(delta_x, delta_y)
        return {"x": x, "y": y, "scrolled_y": delta_y}

    async def select_option(self, selector: str, value: str) -> dict:
        page = await self._ensure_page()
        await page.select_option(selector, value)
        return {"selector": selector, "value": value, "selected": True}

    async def hover(self, selector: str) -> dict:
        page = await self._ensure_page()
        await page.hover(selector)
        return {"selector": selector, "hovered": True}

    # ─── Content & Screenshots ────────────────────────────────────

    async def screenshot(self) -> str:
        """Take a screenshot and return as base64."""
        page = await self._ensure_page()
        raw = await page.screenshot(type="png")
        return base64.b64encode(raw).decode("utf-8")

    async def get_content(self) -> dict:
        """Get the page text content."""
        page = await self._ensure_page()
        text = await page.inner_text("body")
        if len(text) > 5000:
            text = text[:5000] + "\n... [truncated]"
        return {"url": page.url, "title": await page.title(), "content": text}

    async def get_html(self) -> dict:
        """Get the page HTML."""
        page = await self._ensure_page()
        html = await page.content()
        if len(html) > 10000:
            html = html[:10000] + "\n... [truncated]"
        return {"url": page.url, "html": html}

    async def evaluate(self, expression: str) -> dict:
        """Execute JavaScript in the page."""
        page = await self._ensure_page()
        result = await page.evaluate(expression)
        return {"result": str(result)}

    async def wait_for(self, selector: str, timeout: int = 5000) -> dict:
        """Wait for an element to appear."""
        page = await self._ensure_page()
        try:
            await page.wait_for_selector(selector, timeout=timeout)
            return {"selector": selector, "found": True}
        except Exception:
            return {"selector": selector, "found": False}

    # ─── Lifecycle ────────────────────────────────────────────────

    async def close(self) -> dict:
        if self._browser:
            await self._browser.close()
            self._browser = None
            self._page = None
            self._context = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None
        logger.info("Browser closed")
        return {"status": "closed"}
