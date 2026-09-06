# ORBIT

Your AI assistant that lives on your device. Built for focus, productivity and complete privacy.

## Architecture

```
orbit/
├── apps/
│   ├── web/                    ← Next.js frontend (dashboard control center)
│   └── api/                    ← Node.js API gateway
├── agent/                      ← Python AI agent (the brain)
│   ├── computer/               ← Browser, filesystem, terminal control
│   ├── llm/                    ← LLM client (OpenAI, Anthropic, Gemini)
│   ├── tools/                  ← Tool registry (20+ tools)
│   ├── voice/                  ← STT, TTS, wake word detection
│   ├── agent_core.py           ← Observation loop (think → act → observe)
│   └── main.py                 ← FastAPI server (REST + WebSocket)
├── infrastructure/
│   └── docker/                 ← Dockerfiles + compose
└── packages/
    ├── database/               ← Supabase/DB layer
    ├── types/                  ← Shared TypeScript/Python schemas
    └── ui/                     ← Shared UI components (shadcn)
```

## Getting Started

### Prerequisites
- Node.js 22+
- Python 3.10+
- An LLM API key (Gemini, OpenAI, or Anthropic)

### Setup

```bash
# Install JS deps
pnpm install

# Set up Python agent
cd agent
python3 -m venv .venv
source .venv/bin/activate
pip install playwright openai anthropic google-generativeai fastapi "uvicorn[standard]" pydantic python-dotenv httpx edge-tts pyaudio
playwright install chromium

# Configure
cp .env.example .env
# Edit .env with your API keys
```

### Run

```bash
# Frontend (port 3000)
pnpm dev:web

# Agent (port 8000)
cd agent && python main.py

# Or with Docker
cd infrastructure/docker && docker-compose up
```

### Usage

**Dashboard**: Open http://localhost:3000/dashboard — send commands and watch ORBIT work in real-time.

**API**:
```bash
# Run a task
curl -X POST http://localhost:8000/agent/run \
  -H "Content-Type: application/json" \
  -d '{"task": "Open Google and search for cats"}'

# Stream events
curl -X POST http://localhost:8000/agent/run/stream \
  -H "Content-Type: application/json" \
  -d '{"task": "Find the weather in London"}'

# WebSocket (real-time)
ws://localhost:8000/ws/agent
ws://localhost:8000/ws/live
```

## Phases

### Phase 1 — Core
- Playwright browser automation
- Terminal command execution
- Filesystem operations
- LLM-powered planning (OpenAI, Anthropic, Gemini)
- Tool calling observation loop

### Phase 2 — Computer Use
- Screenshots + visual understanding
- Mouse/keyboard control
- Tab management
- Live browser view (WebSocket)
- CSS selector + coordinate-based interaction

### Phase 3 — Voice
- Wake word detection ("Hey ORBIT")
- Streaming speech recognition
- Text-to-speech (Edge TTS)
- Conversational context
- Interruption support

## LLM Providers

| Provider | Model | Env Var |
|----------|-------|---------|
| Gemini | gemini-2.0-flash | `GEMINI_API_KEY` |
| OpenAI | gpt-4o | `OPENAI_API_KEY` |
| Anthropic | claude-sonnet-4-20250514 | `ANTHROPIC_API_KEY` |

Set `LLM_PROVIDER` in `.env` to switch between providers.

## Agent Tools (20+)

| Category | Tools |
|----------|-------|
| Browser | navigate, click, type, press, hover, scroll, screenshot |
| Tabs | new_tab, switch_tab, close_tab, list_tabs |
| Mouse | mouse_click, mouse_move, mouse_scroll |
| Content | get_content, evaluate (JS), wait_for |
| Terminal | run_command |
| Files | read_file, write_file, list_dir |

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, shadcn/ui, motion, lucide
- **Agent**: Python 3.10, Playwright, FastAPI, WebSocket
- **LLM**: OpenAI / Anthropic / Google Gemini
- **Voice**: Edge TTS, speech_recognition
- **Infra**: Docker, docker-compose
