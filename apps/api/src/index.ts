import "dotenv/config";
import Fastify from "fastify";
import { auth } from "./auth.js";
import { aiRoutes } from "./routes/ai/index.js";
import { chatRoutes } from "./routes/chat/index.js";
import { settingsRoutes } from "./routes/settings/index.js";
import { activityRoutes } from "./routes/activity/index.js";

const server = Fastify({ logger: true });

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3002";

// ─── CORS (manual — avoids conflict with Better Auth's own CORS) ─

server.addHook("onRequest", async (request, reply) => {
  reply.header("Access-Control-Allow-Origin", CLIENT_ORIGIN);
  reply.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  reply.header("Access-Control-Allow-Credentials", "true");

  if (request.method === "OPTIONS") {
    return reply.status(204).send();
  }
});

// ─── Better Auth catch-all ───────────────────────────────────────

server.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);

      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.headers)) {
        if (value) headers[key] = Array.isArray(value) ? value.join(", ") : value;
      }

      const init: RequestInit = {
        method: request.method,
        headers,
      };

      if (request.body) {
        init.body = JSON.stringify(request.body);
        headers["content-type"] = "application/json";
      }

      const req = new Request(url.toString(), init);
      const response = await auth.handler(req);

      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      return reply.send(response.body ? await response.text() : null);
    } catch (error: any) {
      server.log.error("Auth Error:", error?.message || error);
      return reply.status(500).send({ error: "Authentication error" });
    }
  },
});

// ─── Health ──────────────────────────────────────────────────────

server.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// ─── Routes ──────────────────────────────────────────────────────

server.register(aiRoutes, { prefix: "/api/ai" });
server.register(chatRoutes, { prefix: "/api/chat" });
server.register(settingsRoutes, { prefix: "/api/settings" });
server.register(activityRoutes, { prefix: "/api/activity" });

// ─── Start ───────────────────────────────────────────────────────

server.listen({ port: 3001, host: "0.0.0.0" }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
});
