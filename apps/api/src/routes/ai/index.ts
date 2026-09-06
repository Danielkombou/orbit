import type { FastifyInstance } from "fastify";

const AGENT_URL = process.env.AGENT_URL || "http://localhost:8000";

export async function aiRoutes(app: FastifyInstance) {
  app.post("/chat", async (request, reply) => {
    const { messages, model } = request.body as {
      messages: { role: string; content: string }[];
      model?: string;
    };

    try {
      const lastMessage = messages[messages.length - 1];
      const res = await fetch(`${AGENT_URL}/agent/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: lastMessage.content }),
      });

      if (!res.ok) {
        return reply.status(502).send({ error: "Agent unavailable" });
      }

      const data = await res.json() as { answer: string };
      return { role: "assistant", content: data.answer };
    } catch (error) {
      return reply.status(502).send({ error: "Agent unavailable" });
    }
  });

  app.post("/stream", async (request, reply) => {
    const { task } = request.body as { task: string };

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");

    try {
      const res = await fetch(`${AGENT_URL}/agent/run/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });

      if (!res.ok || !res.body) {
        reply.raw.end("data: {\"type\":\"error\",\"message\":\"Agent unavailable\"}\n\n");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        reply.raw.write(chunk);
      }
    } catch {
      reply.raw.write("data: {\"type\":\"error\",\"message\":\"Agent connection failed\"}\n\n");
    }

    reply.raw.end();
  });

  app.get("/models", async () => {
    return {
      models: [
        { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
        { id: "claude-sonnet-4-20250514", name: "Claude Sonnet", provider: "anthropic" },
        { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", provider: "gemini" },
      ],
    };
  });
}
