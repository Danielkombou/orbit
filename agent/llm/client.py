"""ORBIT Agent - LLM client supporting OpenAI, Anthropic, and Gemini."""

from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any, AsyncGenerator

from .types import LLMResponse, Message, Role, ToolCall

logger = logging.getLogger(__name__)


class LLMClient:
    """Unified LLM client supporting OpenAI, Anthropic, and Gemini."""

    def __init__(self, provider: str | None = None):
        self.provider = provider or os.getenv("LLM_PROVIDER", "openai")
        self._client = None

    def _get_client(self):
        if self._client:
            return self._client

        if self.provider == "anthropic":
            import anthropic
            self._client = anthropic.AsyncAnthropic(
                api_key=os.getenv("ANTHROPIC_API_KEY"),
            )
        elif self.provider == "gemini":
            from google import genai
            self._client = genai.Client(
                api_key=os.getenv("GEMINI_API_KEY"),
            )
        else:
            import openai
            self._client = openai.AsyncOpenAI(
                api_key=os.getenv("OPENAI_API_KEY"),
                base_url=os.getenv("OPENAI_BASE_URL"),
                timeout=float(os.getenv("LLM_TIMEOUT", "120")),
            )

        return self._client

    def _get_model(self) -> str:
        if self.provider == "anthropic":
            return os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
        if self.provider == "gemini":
            return os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
        return os.getenv("OPENAI_MODEL", "gpt-4o")

    async def chat(
        self,
        messages: list[Message],
        tools: list[dict] | None = None,
        images: list[str] | None = None,
    ) -> LLMResponse:
        """Send a chat completion request. images = list of base64 PNG strings."""
        client = self._get_client()
        model = self._get_model()

        if self.provider == "anthropic":
            return await self._chat_anthropic(client, model, messages, tools, images)
        if self.provider == "gemini":
            return await self._chat_gemini(client, model, messages, tools, images)
        return await self._chat_openai(client, model, messages, tools, images)

    async def chat_stream(
        self,
        messages: list[Message],
        tools: list[dict] | None = None,
        images: list[str] | None = None,
    ) -> AsyncGenerator[dict, None]:
        """Stream a chat completion, yielding {type, ...} events."""
        client = self._get_client()
        model = self._get_model()

        if self.provider == "openai":
            async for event in self._chat_openai_stream(client, model, messages, tools, images):
                yield event
        else:
            # Fallback: non-streaming providers yield full response as one chunk
            resp = await self.chat(messages, tools, images)
            if resp.content:
                yield {"type": "text_delta", "delta": resp.content}
            if resp.tool_calls:
                yield {"type": "tool_calls", "tool_calls": resp.tool_calls}
            yield {"type": "done", "finish_reason": resp.finish_reason}

    async def _chat_openai_stream(
        self, client, model: str, messages: list[Message],
        tools: list[dict] | None, images: list[str] | None,
    ) -> AsyncGenerator[dict, None]:
        formatted = [m.to_dict() for m in messages]

        if images and formatted:
            last_user = None
            for i in range(len(formatted) - 1, -1, -1):
                if formatted[i]["role"] == "user":
                    last_user = i
                    break
            if last_user is not None:
                content_parts = [{"type": "text", "text": formatted[last_user].get("content", "")}]
                for img in images:
                    content_parts.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{img}"},
                    })
                formatted[last_user]["content"] = content_parts

        kwargs: dict[str, Any] = {"model": model, "messages": formatted, "stream": True}
        if tools:
            kwargs["tools"] = tools
        kwargs["max_tokens"] = int(os.getenv("LLM_MAX_TOKENS", "800"))

        stream = await client.chat.completions.create(**kwargs)

        # Accumulate tool calls from streamed chunks
        tool_calls_acc: dict[int, dict] = {}
        content_parts: list[str] = []
        finish_reason = None
        chunk_count = 0

        async for chunk in stream:
            chunk_count += 1
            delta = chunk.choices[0].delta if chunk.choices else None
            finish_reason = chunk.choices[0].finish_reason if chunk.choices else finish_reason

            if delta and delta.content:
                content_parts.append(delta.content)
                yield {"type": "text_delta", "delta": delta.content}

            if delta and delta.tool_calls:
                for tc_delta in delta.tool_calls:
                    idx = tc_delta.index
                    if idx not in tool_calls_acc:
                        tool_calls_acc[idx] = {"id": tc_delta.id or "", "name": "", "args_str": ""}
                    acc = tool_calls_acc[idx]
                    if tc_delta.id:
                        acc["id"] = tc_delta.id
                    if tc_delta.function:
                        if tc_delta.function.name:
                            acc["name"] = tc_delta.function.name
                        if tc_delta.function.arguments:
                            acc["args_str"] += tc_delta.function.arguments

        logger.info("Stream complete: %d chunks, %d content parts, %d tool calls, finish=%s",
                     chunk_count, len(content_parts), len(tool_calls_acc), finish_reason)

        # Yield accumulated tool calls
        if tool_calls_acc:
            tool_calls = []
            for idx in sorted(tool_calls_acc.keys()):
                acc = tool_calls_acc[idx]
                try:
                    args = json.loads(acc["args_str"])
                except json.JSONDecodeError:
                    args = {"raw": acc["args_str"]}
                tool_calls.append(ToolCall(id=acc["id"], name=acc["name"], arguments=args))
            yield {"type": "tool_calls", "tool_calls": tool_calls}

        yield {"type": "done", "finish_reason": finish_reason}

    async def _chat_openai(
        self, client, model: str, messages: list[Message],
        tools: list[dict] | None, images: list[str] | None,
    ) -> LLMResponse:
        formatted = [m.to_dict() for m in messages]

        # Inject screenshots into the last user message if provided
        if images and formatted:
            last_user = None
            for i in range(len(formatted) - 1, -1, -1):
                if formatted[i]["role"] == "user":
                    last_user = i
                    break
            if last_user is not None:
                content_parts = [{"type": "text", "text": formatted[last_user].get("content", "")}]
                for img in images:
                    content_parts.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{img}"},
                    })
                formatted[last_user]["content"] = content_parts

        kwargs: dict[str, Any] = {"model": model, "messages": formatted}
        if tools:
            kwargs["tools"] = tools
        kwargs["max_tokens"] = int(os.getenv("LLM_MAX_TOKENS", "800"))

        response = await client.chat.completions.create(**kwargs)
        choice = response.choices[0]
        message = choice.message

        tool_calls = []
        if message.tool_calls:
            for tc in message.tool_calls:
                try:
                    args = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    args = {"raw": tc.function.arguments}
                tool_calls.append(ToolCall(id=tc.id, name=tc.function.name, arguments=args))

        return LLMResponse(
            content=message.content,
            tool_calls=tool_calls,
            finish_reason=choice.finish_reason,
            usage={
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
            } if response.usage else {},
        )

    async def _chat_anthropic(
        self, client, model: str, messages: list[Message],
        tools: list[dict] | None, images: list[str] | None,
    ) -> LLMResponse:
        system_msg = ""
        chat_messages = []
        for m in messages:
            if m.role == Role.SYSTEM:
                system_msg = m.content or ""
            else:
                chat_messages.append(m.to_dict())

        if chat_messages and chat_messages[0]["role"] != "user":
            chat_messages.insert(0, {"role": "user", "content": "Ready."})

        # Inject images into last user message
        if images and chat_messages:
            last_user_idx = None
            for i in range(len(chat_messages) - 1, -1, -1):
                if chat_messages[i]["role"] == "user":
                    last_user_idx = i
                    break
            if last_user_idx is not None:
                text = chat_messages[last_user_idx].get("content", "")
                content_parts = [{"type": "text", "text": text}]
                for img in images:
                    content_parts.append({
                        "type": "image",
                        "source": {"type": "base64", "media_type": "image/png", "data": img},
                    })
                chat_messages[last_user_idx]["content"] = content_parts

        kwargs: dict[str, Any] = {"model": model, "max_tokens": 4096, "messages": chat_messages}
        if system_msg:
            kwargs["system"] = system_msg
        if tools:
            kwargs["tools"] = tools

        response = await client.messages.create(**kwargs)

        tool_calls = []
        content_text = ""
        for block in response.content:
            if block.type == "text":
                content_text += block.text
            elif block.type == "tool_use":
                tool_calls.append(ToolCall(id=block.id, name=block.name, arguments=block.input))

        return LLMResponse(
            content=content_text or None,
            tool_calls=tool_calls,
            finish_reason=response.stop_reason,
            usage={
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            },
        )

    async def _chat_gemini(
        self, client, model: str, messages: list[Message],
        tools: list[dict] | None, images: list[str] | None,
    ) -> LLMResponse:
        from google import genai
        from google.genai import types

        # Build contents and system instruction
        system_instruction = ""
        contents = []

        for m in messages:
            if m.role == Role.SYSTEM:
                system_instruction = m.content or ""
                continue
            role = "user" if m.role in (Role.USER, Role.TOOL) else "model"
            parts = []
            if m.content:
                parts.append(m.content)
            if m.tool_calls:
                for tc in m.tool_calls:
                    parts.append(types.Part.from_function_response(
                        name=tc.name,
                        response=tc.arguments,
                    ))
            if parts:
                contents.append(types.Content(role=role, parts=parts))

        # Ensure contents starts with user
        if contents and contents[0].role != "user":
            contents.insert(0, types.Content(role="user", parts=["Ready."]))

        # Build tools
        gemini_tools = None
        if tools:
            function_declarations = []
            for t in tools:
                fn = t.get("function", {})
                params = fn.get("parameters", {}).get("properties", {})
                if params:
                    gemini_params = types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            k: types.Schema(type=types.Type.STRING, description=v.get("description", ""))
                            for k, v in params.items()
                        },
                        required=fn.get("parameters", {}).get("required", []),
                    )
                else:
                    gemini_params = None
                function_declarations.append(types.FunctionDeclaration(
                    name=fn["name"],
                    description=fn.get("description", ""),
                    parameters=gemini_params,
                ))
            gemini_tools = [types.Tool(function_declarations=function_declarations)]

        # Add images to last user message
        if images and contents:
            for c in reversed(contents):
                if c.role == "user":
                    for img in images:
                        c.parts.append(types.Part.from_bytes(
                            mime_type="image/png",
                            data=base64.b64decode(img),
                        ))
                    break

        # Build config
        config = types.GenerateContentConfig(
            temperature=0.7,
            tools=gemini_tools or [],
        )
        if system_instruction:
            config.system_instruction = system_instruction

        response = await client.aio.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )

        # Parse response
        tool_calls = []
        content_text = ""

        if response.candidates:
            candidate = response.candidates[0]
            for part in candidate.content.parts:
                if part.text:
                    content_text += part.text
                elif part.function_call:
                    args = {}
                    if part.function_call.args:
                        args = dict(part.function_call.args)
                    tool_calls.append(ToolCall(
                        id=f"gemini_{len(tool_calls)}",
                        name=part.function_call.name,
                        arguments=args,
                    ))

        return LLMResponse(
            content=content_text or None,
            tool_calls=tool_calls,
            finish_reason="stop",
            usage={},
        )
