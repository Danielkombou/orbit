"""ORBIT Agent - FastAPI entry point with WebSocket and voice support."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

agent_dir = Path(__file__).parent
load_dotenv(agent_dir / ".env")
sys.path.insert(0, str(agent_dir))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel

from agent_core import Agent
from voice import VoiceManager
import data

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ORBIT Agent starting...")
    yield
    logger.info("ORBIT Agent stopped")


app = FastAPI(title="ORBIT Agent", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


# ─── Models ──────────────────────────────────────────────────────

class RunRequest(BaseModel):
    task: str
    max_steps: int | None = None
    screenshots: list[str] | None = None

class RunResponse(BaseModel):
    success: bool
    answer: str
    total_steps: int

class VoiceRequest(BaseModel):
    text: str
    max_steps: int | None = None


# ─── REST Endpoints ──────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "agent": "ready", "version": "0.2.0"}

@app.get("/agent/screenshot")
async def get_screenshot():
    """Get current browser screenshot as PNG."""
    agent = Agent()
    try:
        b64 = await agent.computer.browser.screenshot()
        if b64:
            import base64
            png_data = base64.b64decode(b64)
            return Response(content=png_data, media_type="image/png")
        return Response(status_code=404)
    finally:
        await agent.computer.browser.close()

@app.post("/agent/run", response_model=RunResponse)
async def run_agent(request: RunRequest):
    agent = Agent(max_steps=request.max_steps)
    try:
        result = await agent.run(request.task, screenshots=request.screenshots)
        return RunResponse(success=result.success, answer=result.answer, total_steps=result.total_steps)
    finally:
        await agent.cleanup()

@app.post("/agent/run/stream")
async def run_agent_stream(request: RunRequest):
    agent = Agent(max_steps=request.max_steps)

    async def event_stream():
        try:
            async for event in agent.run_streaming(request.task, screenshots=request.screenshots):
                yield f"data: {json.dumps(event)}\n\n"
        finally:
            await agent.cleanup()

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.post("/agent/voice")
async def voice_command(request: VoiceRequest):
    """Process a voice command (text) and return the result."""
    agent = Agent(max_steps=request.max_steps)
    try:
        result = await agent.run(request.text)
        voice_mgr = VoiceManager()
        audio = await voice_mgr.speak_response(result.answer)
        return {
            "success": result.success,
            "answer": result.answer,
            "total_steps": result.total_steps,
            "audio_size": len(audio),
        }
    finally:
        await agent.cleanup()


# ─── Data REST Endpoints ─────────────────────────────────────────

@app.get("/agent/tasks")
async def list_tasks(status: str | None = None, limit: int = 20):
    return data.list_tasks(status=status, limit=limit)

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"
    due_date: str | None = None

@app.post("/agent/tasks")
async def create_task(request: TaskCreate):
    return data.create_task(
        title=request.title,
        description=request.description,
        priority=request.priority,
        due_date=request.due_date,
    )

@app.patch("/agent/tasks/{task_id}/complete")
async def complete_task(task_id: int):
    return data.complete_task(task_id)

@app.delete("/agent/tasks/{task_id}")
async def delete_task(task_id: int):
    return data.delete_task(task_id)


@app.get("/agent/notes")
async def list_notes(tag: str | None = None, limit: int = 20):
    return data.list_notes(tag=tag, limit=limit)

class NoteCreate(BaseModel):
    title: str
    content: str
    tags: list[str] | None = None

@app.post("/agent/notes")
async def create_note(request: NoteCreate):
    return data.create_note(
        title=request.title,
        content=request.content,
        tags=request.tags,
    )

@app.delete("/agent/notes/{note_id}")
async def delete_note(note_id: int):
    return data.delete_note(note_id)


class MemoryStore(BaseModel):
    key: str
    content: str
    category: str = "general"

@app.get("/agent/memories")
async def list_memories(category: str | None = None, limit: int = 50):
    return data.recall_all(category=category, limit=limit)

@app.post("/agent/memories")
async def store_memory(request: MemoryStore):
    return data.remember(key=request.key, content=request.content, category=request.category)

@app.get("/agent/memories/{key}")
async def get_memory(key: str):
    return data.recall(key=key)

@app.delete("/agent/memories/{key}")
async def forget_memory(key: str):
    return data.forget(key)


# ─── WebSocket for real-time events ──────────────────────────────

@app.websocket("/ws/agent")
async def websocket_agent(ws: WebSocket):
    """WebSocket endpoint for real-time agent communication."""
    await ws.accept()
    agent = Agent()
    logger.info("WebSocket client connected")

    try:
        while True:
            data = await ws.receive_json()
            task = data.get("task", "")
            screenshots = data.get("screenshots", [])

            if not task:
                await ws.send_json({"type": "error", "message": "No task provided"})
                continue

            await ws.send_json({"type": "started", "task": task})

            try:
                async for event in agent.run_streaming(task, screenshots=screenshots):
                    await ws.send_json(event)
            except Exception as e:
                await ws.send_json({"type": "error", "message": str(e)})
            finally:
                await agent.cleanup()
                agent = Agent()

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.exception("WebSocket error: %s", e)
    finally:
        try:
            await agent.cleanup()
        except Exception:
            pass


# ─── WebSocket for live computer view ────────────────────────────

@app.websocket("/ws/live")
async def websocket_live(ws: WebSocket):
    """Streams screenshots at ~2 FPS for live computer view."""
    await ws.accept()
    agent = Agent()
    fps = float(os.getenv("LIVE_VIEW_FPS", "2"))
    interval = 1.0 / fps

    try:
        while True:
            b64 = await agent.computer.browser.screenshot()
            if b64:
                await ws.send_json({"type": "frame", "screenshot": b64})
            await asyncio.sleep(interval)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.exception("Live view error: %s", e)
    finally:
        await agent.cleanup()


def run():
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "info").upper(),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    run()
