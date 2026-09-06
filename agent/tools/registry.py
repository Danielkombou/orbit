"""ORBIT Agent - Tool registry that maps tool names to implementations."""

from __future__ import annotations

import json
import logging
from typing import Any, Callable, Awaitable

from computer import Computer
from tools.definitions import ALL_TOOLS

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
        self.register("browser_go_forward", c.browser.go_forward)
        self.register("browser_reload", c.browser.reload)

        # Browser interaction
        self.register("browser_click", c.browser.click)
        self.register("browser_type", c.browser.type_text)
        self.register("browser_press", c.browser.press)
        self.register("browser_select_option", c.browser.select_option)
        self.register("browser_hover", c.browser.hover)

        # Browser mouse
        self.register("browser_mouse_click", c.browser.mouse_click)
        self.register("browser_mouse_move", c.browser.mouse_move)
        self.register("browser_mouse_scroll", c.browser.mouse_scroll)

        # Browser tabs
        self.register("browser_new_tab", c.browser.new_tab)
        self.register("browser_switch_tab", c.browser.switch_tab)
        self.register("browser_close_tab", c.browser.close_tab)
        self.register("browser_list_tabs", c.browser.list_tabs)

        # Browser content
        self.register("browser_screenshot", c.browser.screenshot)
        self.register("browser_get_content", c.browser.get_content)
        self.register("browser_evaluate", c.browser.evaluate)
        self.register("browser_wait_for", c.browser.wait_for)
        self.register("browser_close", c.browser.close)

        # Terminal
        self.register("run_command", c.terminal.run_command)

        # Filesystem
        self.register("read_file", c.filesystem.read_file)
        self.register("write_file", c.filesystem.write_file)
        self.register("list_dir", c.filesystem.list_dir)

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

    def list_tools(self) -> list[str]:
        return list(self._tools.keys())
