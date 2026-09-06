import type { FastifyInstance } from "fastify";
import { db, chatSession, chatMessage } from "@orbit/database";
import { requireAuth } from "../../middleware/auth.js";
import { eq, desc } from "drizzle-orm";

export async function chatRoutes(app: FastifyInstance) {
  // List chat sessions
  app.get("/", { preHandler: [requireAuth] }, async (request) => {
    const user = (request as any).user;
    const sessions = await db
      .select()
      .from(chatSession)
      .where(eq(chatSession.userId, user.id))
      .orderBy(desc(chatSession.updatedAt));
    return { sessions };
  });

  // Create chat session
  app.post("/", { preHandler: [requireAuth] }, async (request) => {
    const user = (request as any).user;
    const { title } = request.body as { title?: string };
    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(chatSession).values({
      id,
      userId: user.id,
      title: title || "New Chat",
      createdAt: now,
      updatedAt: now,
    });

    return { id, title: title || "New Chat" };
  });

  // Get messages for a session
  app.get("/:sessionId/messages", { preHandler: [requireAuth] }, async (request) => {
    const { sessionId } = request.params as { sessionId: string };
    const messages = await db
      .select()
      .from(chatMessage)
      .where(eq(chatMessage.sessionId, sessionId))
      .orderBy(chatMessage.createdAt);
    return { messages };
  });

  // Send message in a session
  app.post("/:sessionId/messages", { preHandler: [requireAuth] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const { content } = request.body as { content: string };

    const AGENT_URL = process.env.AGENT_URL || "http://localhost:8000";

    // Save user message
    const userMsgId = crypto.randomUUID();
    await db.insert(chatMessage).values({
      id: userMsgId,
      sessionId,
      role: "user",
      content,
      createdAt: new Date(),
    });

    // Call agent
    try {
      const res = await fetch(`${AGENT_URL}/agent/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: content }),
      });

      if (!res.ok) {
        return reply.status(502).send({ error: "Agent unavailable" });
      }

      const data = await res.json() as { answer: string; totalSteps: number };

      // Save assistant message
      const assistantMsgId = crypto.randomUUID();
      await db.insert(chatMessage).values({
        id: assistantMsgId,
        sessionId,
        role: "assistant",
        content: data.answer,
        metadata: { totalSteps: data.totalSteps },
        createdAt: new Date(),
      });

      // Update session timestamp
      await db
        .update(chatSession)
        .set({ updatedAt: new Date() })
        .where(eq(chatSession.id, sessionId));

      return { id: assistantMsgId, content: data.answer };
    } catch {
      return reply.status(502).send({ error: "Agent connection failed" });
    }
  });

  // Delete chat session
  app.delete("/:sessionId", { preHandler: [requireAuth] }, async (request) => {
    const { sessionId } = request.params as { sessionId: string };
    await db.delete(chatSession).where(eq(chatSession.id, sessionId));
    return { success: true };
  });
}
