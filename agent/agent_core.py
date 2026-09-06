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

    async def run(self, task: str, screenshots: list[str] | None = None) -> AgentResult:
        messages = [
            Message(role=Role.SYSTEM, content=self._system_prompt()),
            Message(role=Role.USER, content=task),
        ]
        steps: list[AgentStep] = []
        pending_screenshots: list[str] = list(screenshots or [])

        for step_num in range(1, self.max_steps + 1):
            logger.info("Step %d/%d", step_num, self.max_steps)

            response = await self.llm.chat(
                messages=messages,
                tools=self.tools.get_definitions(),
                images=pending_screenshots if pending_screenshots else None,
            )
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

    async def run_streaming(self, task: str, screenshots: list[str] | None = None) -> AsyncGenerator[dict, None]:
        messages = [
            Message(role=Role.SYSTEM, content=self._system_prompt()),
            Message(role=Role.USER, content=task),
        ]
        pending_screenshots: list[str] = list(screenshots or [])

        for step_num in range(1, self.max_steps + 1):
            yield {"type": "step_start", "step": step_num, "max": self.max_steps}

            response = await self.llm.chat(
                messages=messages,
                tools=self.tools.get_definitions(),
                images=pending_screenshots if pending_screenshots else None,
            )
            pending_screenshots = []

            if response.content:
                yield {"type": "thought", "content": response.content}

            if not response.has_tool_calls:
                yield {"type": "done", "answer": response.content or "Task completed.", "success": True}
                return

            messages.append(Message(
                role=Role.ASSISTANT, content=response.content, tool_calls=response.tool_calls,
            ))

            for tc in response.tool_calls:
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
        return f"""You are ORBIT, an AI agent with full computer control.

You have these tools: {tools_list}

CAPABILITIES:
- Navigate websites, click elements, fill forms, type text
- Take screenshots to see what's on screen (visual understanding)
- Use mouse clicks at x,y coordinates for precise interaction
- Open/switch/close browser tabs
- Execute terminal commands and manage files
- Scroll pages, hover elements, press keyboard keys

WORKFLOW:
1. Understand the user's goal
2. Break it into steps
3. Use tools to execute each step
4. Take screenshots to verify results
5. Continue until the task is complete

IMPORTANT:
- Take a screenshot after key actions to see the result
- Use browser_get_content to read page text
- Use browser_screenshot for visual understanding
- Use browser_mouse_click for coordinate-based clicks
- Summarize what you did when finished

Be methodical. Think step by step."""

    async def cleanup(self):
        await self.computer.cleanup()
