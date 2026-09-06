import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";

const AGENT_URL = process.env.AGENT_URL || "http://localhost:8000";

export async function taskRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const status = (request.query as { status?: string }).status;
    const limit = Number((request.query as { limit?: string }).limit) || 20;

    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      params.set("limit", String(limit));

      const res = await fetch(`${AGENT_URL}/agent/tasks?${params}`);
      if (!res.ok) return reply.status(502).send({ error: "Agent unavailable" });
      return await res.json();
    } catch {
      return reply.status(502).send({ error: "Agent unavailable" });
    }
  });

  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as { title: string; description?: string; priority?: string; due_date?: string };
    try {
      const res = await fetch(`${AGENT_URL}/agent/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return reply.status(502).send({ error: "Agent unavailable" });
      return await res.json();
    } catch {
      return reply.status(502).send({ error: "Agent unavailable" });
    }
  });

  app.patch("/:id/complete", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const res = await fetch(`${AGENT_URL}/agent/tasks/${id}/complete`, { method: "PATCH" });
      if (!res.ok) return reply.status(502).send({ error: "Agent unavailable" });
      return await res.json();
    } catch {
      return reply.status(502).send({ error: "Agent unavailable" });
    }
  });

  app.delete("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const res = await fetch(`${AGENT_URL}/agent/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) return reply.status(502).send({ error: "Agent unavailable" });
      return await res.json();
    } catch {
      return reply.status(502).send({ error: "Agent unavailable" });
    }
  });
}
