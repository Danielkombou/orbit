"""ORBIT Computer - Unified interface to browser, filesystem, and terminal."""

from __future__ import annotations

from .browser import BrowserComputer
from .filesystem import FilesystemComputer
from .terminal import TerminalComputer


class Computer:
    """Bundles all computer capabilities into one interface."""

    def __init__(self, sandbox_dir: str = "/tmp/orbit-sandbox"):
        self.browser = BrowserComputer()
        self.filesystem = FilesystemComputer(sandbox_dir)
        self.terminal = TerminalComputer(sandbox_dir)

    async def cleanup(self):
        """Clean up all resources."""
        await self.browser.close()
