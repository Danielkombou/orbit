"""ORBIT Computer - Filesystem operations."""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class FilesystemComputer:
    """Provides file system read/write operations within a sandbox."""

    def __init__(self, sandbox_dir: str = "/tmp/orbit-sandbox"):
        self.sandbox = Path(sandbox_dir)
        self.sandbox.mkdir(parents=True, exist_ok=True)

    def _resolve(self, path: str) -> Path:
        """Resolve a path relative to the sandbox."""
        target = (self.sandbox / path).resolve()
        if not str(target).startswith(str(self.sandbox)):
            raise ValueError(f"Path traversal not allowed: {path}")
        return target

    async def read_file(self, path: str) -> dict:
        """Read a file's contents."""
        target = self._resolve(path)
        if not target.exists():
            return {"error": f"File not found: {path}"}
        content = target.read_text(errors="replace")
        if len(content) > 10000:
            content = content[:10000] + "\n... [truncated]"
        return {"path": path, "content": content, "size": target.stat().st_size}

    async def write_file(self, path: str, content: str) -> dict:
        """Write content to a file."""
        target = self._resolve(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)
        logger.info("Wrote file: %s", target)
        return {"path": path, "size": len(content), "written": True}

    async def list_dir(self, path: str = ".") -> dict:
        """List directory contents."""
        target = self._resolve(path)
        if not target.exists():
            return {"error": f"Directory not found: {path}"}
        if not target.is_dir():
            return {"error": f"Not a directory: {path}"}

        entries = []
        for entry in sorted(target.iterdir()):
            entries.append({
                "name": entry.name,
                "type": "dir" if entry.is_dir() else "file",
                "size": entry.stat().st_size if entry.is_file() else None,
            })
        return {"path": path, "entries": entries}

    async def delete_file(self, path: str) -> dict:
        """Delete a file."""
        target = self._resolve(path)
        if not target.exists():
            return {"error": f"File not found: {path}"}
        target.unlink()
        return {"path": path, "deleted": True}
