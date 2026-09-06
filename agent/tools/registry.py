"""ORBIT Agent - Tool registry that maps tool names to implementations."""

from __future__ import annotations

import json
import logging
from typing import Any, Callable, Awaitable

from computer import Computer
from tools.definitions import ALL_TOOLS, CORE_TOOLS
from tools.web import search_web, open_website
import data

logger = logging.getLogger(__name__)


class ToolRegistry:
    """Maps tool names to their implementations."""

    def __init__(self, computer: Computer):
        self.computer = computer
        self._tools: dict[str, Callable[..., Awaitable[dict]]] = {}
        self._register_defaults()

    def _register_defaults(self):
        c = self.computer

        # Browser navigation
        self.register("browser_navigate", c.browser.navigate)
        self.register("browser_go_back", c.browser.go_back)
        self.register("browser_reload", c.browser.reload)

        # Browser interaction (click supports both selector and x,y)
        self.register("browser_click", c.browser.click)
        self.register("browser_type", c.browser.type_text)
        self.register("browser_press", c.browser.press)

        # Browser content
        self.register("browser_screenshot", c.browser.screenshot)
        self.register("browser_get_content", c.browser.get_content)
        self.register("browser_evaluate", c.browser.evaluate)
        self.register("browser_mouse_scroll", c.browser.mouse_scroll)
        self.register("browser_close", c.browser.close)

        # Terminal
        self.register("run_command", c.terminal.run_command)

        # Filesystem
        self.register("read_file", c.filesystem.read_file)
        self.register("write_file", c.filesystem.write_file)
        self.register("list_dir", c.filesystem.list_dir)

        # Tasks
        self.register("create_task", _wrap(data.create_task))
        self.register("complete_task", _wrap(data.complete_task))
        self.register("list_tasks", _wrap(data.list_tasks))
        self.register("delete_task", _wrap(data.delete_task))

        # Notes
        self.register("create_note", _wrap(data.create_note))
        self.register("list_notes", _wrap(data.list_notes))
        self.register("delete_note", _wrap(data.delete_note))

        # Memory
        self.register("remember", _wrap(data.remember))
        self.register("recall", _wrap(data.recall))
        self.register("forget", _wrap(data.forget))

        # Web search
        self.register("search_web", search_web)
        self.register("open_website", open_website)

        # Summarize (reads file then summarizes inline — no LLM call needed here)
        self.register("summarize_file", self._summarize_file)

    async def _summarize_file(self, path: str) -> dict:
        """Read a file and return a summary."""
        content = await self.computer.filesystem.read_file(path)
        if "error" in content:
            return content
        text = content.get("content", "")
        # Simple extractive summary: first 500 chars + key lines
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        summary_lines = lines[:20]
        return {
            "path": path,
            "total_lines": len(lines),
            "summary": "\n".join(summary_lines),
            "truncated": len(text) > 5000,
        }

    def register(self, name: str, fn: Callable[..., Awaitable[dict]]):
        self._tools[name] = fn

    async def execute(self, name: str, arguments: dict[str, Any]) -> str:
        fn = self._tools.get(name)
        if not fn:
            return json.dumps({"error": f"Unknown tool: {name}"})
        try:
            result = await fn(**arguments)
            return json.dumps(result, default=str)
        except Exception as e:
            logger.exception("Tool %s failed", name)
            return json.dumps({"error": str(e)})

    def get_definitions(self) -> list[dict]:
        return ALL_TOOLS

    def get_core_definitions(self) -> list[dict]:
        return CORE_TOOLS

    def list_tools(self) -> list[str]:
        return list(self._tools.keys())


def _wrap(fn):
    """Wrap a synchronous function to be awaitable."""
    async def wrapper(**kwargs):
        return fn(**kwargs)
    return wrapper
