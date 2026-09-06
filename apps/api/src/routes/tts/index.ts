import type { FastifyInstance } from "fastify";
import { execSync } from "child_process";
import { readFileSync, unlinkSync } from "fs";

const EDGE_TTS = "/home/daniel/.local/bin/edge-tts";

export async function ttsRoutes(app: FastifyInstance) {
  app.post("/", async (request, reply) => {
    const TTS_VOICE = process.env.TTS_VOICE || "en-US-GuyNeural";
    const { text } = request.body as { text: string };

    if (!text || text.trim().length === 0) {
      return reply.status(400).send({ error: "No text provided" });
    }

    try {
      const tmpFile = `/tmp/orbit_tts_${Date.now()}.mp3`;
      const escaped = text.replace(/"/g, '\\"').replace(/\n/g, " ").slice(0, 500);
      execSync(
        `"${EDGE_TTS}" --voice "${TTS_VOICE}" --text "${escaped}" --write-media "${tmpFile}"`,
        { timeout: 15000 }
      );
      const audio = readFileSync(tmpFile);
      unlinkSync(tmpFile);

      reply.header("Content-Type", "audio/mpeg");
      reply.header("Content-Length", audio.length);
      return reply.send(audio);
    } catch (error: any) {
      request.log.error(`TTS error: ${error?.message}`);
      return reply.status(500).send({ error: "TTS failed" });
    }
  });
}
