"""ORBIT Computer - Terminal/shell command execution."""

from __future__ import annotations

import asyncio
import logging
import os

logger = logging.getLogger(__name__)


class TerminalComputer:
    """Executes shell commands via asyncio subprocess."""

    def __init__(self, work_dir: str = "/tmp/orbit-sandbox", timeout: int = 30):
        self.work_dir = work_dir
        self.timeout = timeout
        os.makedirs(work_dir, exist_ok=True)

    async def run_command(self, command: str) -> dict:
        """Run a shell command and return the output."""
        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.work_dir,
            )

            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=self.timeout
            )

            stdout_str = stdout.decode(errors="replace").strip()
            stderr_str = stderr.decode(errors="replace").strip()

            if len(stdout_str) > 5000:
                stdout_str = stdout_str[:5000] + "\n... [truncated]"
            if len(stderr_str) > 5000:
                stderr_str = stderr_str[:5000] + "\n... [truncated]"

            return {
                "command": command,
                "exit_code": proc.returncode,
                "stdout": stdout_str,
                "stderr": stderr_str,
            }

        except asyncio.TimeoutError:
            return {
                "command": command,
                "error": f"Command timed out after {self.timeout}s",
            }
        except Exception as e:
            return {"command": command, "error": str(e)}
