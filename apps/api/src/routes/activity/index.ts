import type { FastifyInstance } from "fastify";
import { db, activityLog } from "@orbit/database";
import { requireAuth } from "../../middleware/auth.js";
import { eq, desc } from "drizzle-orm";

export async function activityRoutes(app: FastifyInstance) {
  // Get activity logs
  app.get("/", { preHandler: [requireAuth] }, async (request) => {
    const user = (request as any).user;
    const { limit } = request.query as { limit?: string };
    const max = limit ? parseInt(limit) : 50;

    const logs = await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.userId, user.id))
      .orderBy(desc(activityLog.createdAt))
      .limit(max);

    return { logs };
  });

  // Create activity log
  app.post("/", { preHandler: [requireAuth] }, async (request) => {
    const user = (request as any).user;
    const { type, title, status, metadata } = request.body as {
      type: string;
      title: string;
      status?: string;
      metadata?: Record<string, unknown>;
    };

    const id = crypto.randomUUID();
    await db.insert(activityLog).values({
      id,
      userId: user.id,
      type,
      title,
      status: status || "completed",
      metadata,
      createdAt: new Date(),
    });

    return { id };
  });
}
