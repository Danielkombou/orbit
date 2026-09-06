import type { FastifyInstance } from "fastify";
import { db, userSettings } from "@orbit/database";
import { requireAuth } from "../../middleware/auth.js";
import { eq } from "drizzle-orm";

export async function settingsRoutes(app: FastifyInstance) {
  // Get settings
  app.get("/", { preHandler: [requireAuth] }, async (request) => {
    const user = (request as any).user;
    const settings = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, user.id))
      .then((rows) => rows[0]);

    if (!settings) {
      return {
        defaultModel: "gpt-4o",
        voiceEnabled: true,
        theme: "dark",
      };
    }

    return settings;
  });

  // Update settings
  app.put("/", { preHandler: [requireAuth] }, async (request) => {
    const user = (request as any).user;
    const { defaultModel, voiceEnabled, theme } = request.body as {
      defaultModel?: string;
      voiceEnabled?: boolean;
      theme?: string;
    };

    const existing = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, user.id))
      .then((rows) => rows[0]);

    if (existing) {
      await db
        .update(userSettings)
        .set({
          ...(defaultModel !== undefined && { defaultModel }),
          ...(voiceEnabled !== undefined && { voiceEnabled }),
          ...(theme !== undefined && { theme }),
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, user.id));
    } else {
      await db.insert(userSettings).values({
        userId: user.id,
        defaultModel: defaultModel || "gpt-4o",
        voiceEnabled: voiceEnabled ?? true,
        theme: theme || "dark",
        updatedAt: new Date(),
      });
    }

    return { success: true };
  });
}
