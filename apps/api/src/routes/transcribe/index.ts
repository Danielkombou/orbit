import type { FastifyInstance } from "fastify";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export async function transcribeRoutes(app: FastifyInstance) {
  app.post("/", async (request, reply) => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (!GROQ_API_KEY) {
      return reply.status(500).send({ error: "GROQ_API_KEY not configured" });
    }

    try {
      const buffer = request.body as Buffer;
      if (!buffer || buffer.length === 0) {
        return reply.status(400).send({ error: "No audio data received" });
      }

      const contentType = request.headers["content-type"] || "audio/webm";
      const formData = new FormData();
      const blob = new Blob([buffer], { type: contentType });
      formData.append("file", blob, "audio.webm");
      formData.append("model", "whisper-large-v3-turbo");
      formData.append("language", "en");
      formData.append("response_format", "json");

      const res = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.text();
        request.log.error(`Groq Whisper error: ${err}`);
        return reply.status(502).send({ error: "Transcription failed" });
      }

      const result = (await res.json()) as { text: string };
      return { text: result.text };
    } catch (error: any) {
      request.log.error(`Transcribe error: ${error?.message}`);
      return reply.status(500).send({ error: "Transcription failed" });
    }
  });
}
