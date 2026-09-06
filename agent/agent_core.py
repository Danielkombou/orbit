"""ORBIT Agent - The observation loop with visual understanding."""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator

from computer import Computer
from llm import LLMClient, Message, Role
from tools import ToolRegistry

logger = logging.getLogger(__name__)

# Tools that produce visual output (screenshots should be sent to LLM)
VISUAL_TOOLS = {"browser_screenshot", "browser_navigate", "browser_click", "browser_type"}


@dataclass
class AgentStep:
    step_number: int
    action: str
    tool_name: str | None = None
    tool_args: dict | None = None
    tool_result: str | None = None
    thought: str | None = None
    screenshot: str | None = None


@dataclass
class AgentResult:
    success: bool
    answer: str
    steps: list[AgentStep]
    total_steps: int


@dataclass
class VoiceState:
    is_listening: bool = False
    is_speaking: bool = False
    is_processing: bool = False
    current_transcript: str = ""
    last_response: str = ""


class Agent:
    """ORBIT agent with visual understanding, voice state, and streaming."""

    def __init__(self, max_steps: int | None = None):
        self.computer = Computer()
        self.llm = LLMClient()
        self.tools = ToolRegistry(self.computer)
        self.max_steps = max_steps or int(os.getenv("MAX_STEPS", "20"))
        self.voice = VoiceState()

    async def run(self, task: str, screenshots: list[str] | None = None, slim: bool = False) -> AgentResult:
        tool_defs = self.tools.get_core_definitions() if slim else self.tools.get_definitions()
        messages = [
            Message(role=Role.SYSTEM, content=self._system_prompt()),
            Message(role=Role.USER, content=task),
        ]
        steps: list[AgentStep] = []
        pending_screenshots: list[str] = list(screenshots or [])

        for step_num in range(1, self.max_steps + 1):
            logger.info("Step %d/%d", step_num, self.max_steps)

            try:
                response = await self.llm.chat(
                    messages=messages,
                    tools=tool_defs,
                    images=pending_screenshots if pending_screenshots else None,
                )
            except Exception as e:
                logger.error("LLM error on step %d: %s", step_num, e)
                error_msg = f"I encountered an API error (rate limit or context too large). Here's what I found so far before the error."
                steps.append(AgentStep(step_number=step_num, action="error", thought=error_msg))
                return AgentResult(success=False, answer=error_msg, steps=steps, total_steps=step_num)
            pending_screenshots = []

            if not response.has_tool_calls:
                answer = response.content or "Task completed."
                steps.append(AgentStep(step_number=step_num, action="respond", thought=answer))
                return AgentResult(success=True, answer=answer, steps=steps, total_steps=step_num)

            messages.append(Message(
                role=Role.ASSISTANT, content=response.content, tool_calls=response.tool_calls,
            ))
            if response.content:
                steps.append(AgentStep(step_number=step_num, action="think", thought=response.content))

            for tc in response.tool_calls:
                logger.info("  Calling tool: %s(%s)", tc.name, tc.arguments)
                result_str = await self.tools.execute(tc.name, tc.arguments)

                # Capture screenshot after visual actions
                screenshot = None
                if tc.name in VISUAL_TOOLS or tc.name == "browser_screenshot":
                    try:
                        screenshot = await self.computer.browser.screenshot()
                    except Exception:
                        pass

                steps.append(AgentStep(
                    step_number=step_num, action="tool_call",
                    tool_name=tc.name, tool_args=tc.arguments,
                    tool_result=result_str, screenshot=screenshot,
                ))

                messages.append(Message(
                    role=Role.TOOL, content=result_str, tool_call_id=tc.id,
                ))

                # If screenshot captured, queue it for next LLM call
                if screenshot and tc.name != "browser_screenshot":
                    pending_screenshots.append(screenshot)

        return AgentResult(
            success=False,
            answer=f"Reached maximum steps ({self.max_steps}).",
            steps=steps, total_steps=self.max_steps,
        )

    async def run_streaming(self, task: str, screenshots: list[str] | None = None, slim: bool = False) -> AsyncGenerator[dict, None]:
        tool_defs = self.tools.get_core_definitions() if slim else self.tools.get_definitions()
        messages = [
            Message(role=Role.SYSTEM, content=self._system_prompt()),
            Message(role=Role.USER, content=task),
        ]
        pending_screenshots: list[str] = list(screenshots or [])

        for step_num in range(1, self.max_steps + 1):
            yield {"type": "step_start", "step": step_num, "max": self.max_steps}

            content_parts: list[str] = []
            tool_calls = []

            try:
                async for event in self.llm.chat_stream(
                    messages=messages,
                    tools=tool_defs,
                    images=pending_screenshots if pending_screenshots else None,
                ):
                    if event["type"] == "text_delta":
                        content_parts.append(event["delta"])
                        yield {"type": "text_delta", "delta": event["delta"]}
                    elif event["type"] == "tool_calls":
                        tool_calls = event["tool_calls"]
                    elif event["type"] == "done":
                        pass
            except Exception as e:
                logger.error("LLM streaming error on step %d: %s", step_num, e)
                yield {"type": "error", "message": f"API error: {e}"}
                return

            pending_screenshots = []
            full_content = "".join(content_parts) if content_parts else None

            if not tool_calls:
                yield {"type": "done", "answer": full_content or "Task completed.", "success": True}
                return

            messages.append(Message(
                role=Role.ASSISTANT, content=full_content, tool_calls=tool_calls,
            ))

            for tc in tool_calls:
                yield {"type": "tool_call", "name": tc.name, "args": tc.arguments}
                result_str = await self.tools.execute(tc.name, tc.arguments)

                screenshot = None
                if tc.name in VISUAL_TOOLS or tc.name == "browser_screenshot":
                    try:
                        screenshot = await self.computer.browser.screenshot()
                    except Exception:
                        pass

                yield {
                    "type": "tool_result", "name": tc.name,
                    "result": result_str,
                    "screenshot": screenshot,
                }

                if screenshot and tc.name != "browser_screenshot":
                    pending_screenshots.append(screenshot)

                messages.append(Message(
                    role=Role.TOOL, content=result_str, tool_call_id=tc.id,
                ))

        yield {"type": "done", "answer": f"Reached maximum steps ({self.max_steps}).", "success": False}

    def _system_prompt(self) -> str:
        tools_list = ", ".join(self.tools.list_tools())
        today = __import__("datetime").date.today().isoformat()
        return f"""You are ORBIT, a student AI assistant. Today: {today}. Tools: {tools_list}

When user asks to "prepare" for a time period: recall() context, list_tasks(), list_notes(), search_web() for deadlines, create_note() with plan, create_task() for each deadline with due_date.
For other requests: use tools to help. Never do consequential actions without asking first. Be concise."""

    async def cleanup(self):
        await self.computer.cleanup()
