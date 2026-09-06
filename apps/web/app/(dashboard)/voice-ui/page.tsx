"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8000";

export default function VoiceUIPage() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback(async (text: string) => {
    try {
      const res = await fetch(`${API_URL}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
        };
        audio.play();
      }
    } catch {
      // TTS is optional, don't block on failure
    }
  }, []);

  const stopListening = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    setTranscript("");
    setResponse("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsProcessing(true);

        try {
          // 1. Send audio to /api/transcribe
          const audioBlob = new Blob(chunks, { type: "audio/webm" });
          const transcribeRes = await fetch(`${API_URL}/api/transcribe`, {
            method: "POST",
            body: audioBlob,
          });

          if (!transcribeRes.ok) {
            toast.error("Transcription failed");
            setIsProcessing(false);
            return;
          }

          const { text } = (await transcribeRes.json()) as { text: string };
          setTranscript(text);

          if (!text || text.trim().length === 0) {
            toast.error("No speech detected");
            setIsProcessing(false);
            return;
          }

          // 2. Send text to agent
          const agentRes = await fetch(`${AGENT_URL}/agent/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task: text }),
          });

          if (!agentRes.ok) {
            toast.error("Agent is not available");
            setIsProcessing(false);
            return;
          }

          const agentData = (await agentRes.json()) as { answer: string };
          setResponse(agentData.answer);

          // 3. Play TTS response
          await playAudio(agentData.answer);
        } catch {
          toast.error("Failed to process voice");
        } finally {
          setIsProcessing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsListening(true);

      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
          setIsListening(false);
        }
      }, 5000);
    } catch {
      toast.error("Microphone access denied");
    }
  }, [playAudio]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <h1 className="text-2xl font-bold mb-2">Voice Interface</h1>
      <p className="text-muted-foreground mb-12">
        Speak naturally to your AI assistant.
      </p>

      <div className="relative mb-8">
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
            isListening
              ? "bg-red-500/20 border-2 border-red-500 animate-pulse"
              : "bg-primary/20 border-2 border-primary hover:bg-primary/30"
          } disabled:opacity-50`}
        >
          {isProcessing ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          ) : isListening ? (
            <MicOff className="w-10 h-10 text-red-500" />
          ) : (
            <Mic className="w-10 h-10 text-primary" />
          )}
        </button>
        {isListening && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
            <span className="text-xs text-red-500 animate-pulse">
              Listening... (5s max)
            </span>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground mt-6 mb-8">
        {isListening
          ? "Listening..."
          : isProcessing
          ? "Processing..."
          : isSpeaking
          ? "Speaking..."
          : "Tap to speak"}
      </p>

      {(transcript || response) && (
        <div className="w-full max-w-md space-y-4">
          {transcript && (
            <div className="p-3 rounded-lg bg-muted text-sm">
              <span className="text-xs text-muted-foreground block mb-1">
                You said:
              </span>
              {transcript}
            </div>
          )}
          {response && (
            <div className="p-3 rounded-lg bg-primary/10 text-sm">
              <span className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                ORBIT
                {isSpeaking && <Volume2 className="w-3 h-3 animate-pulse" />}
              </span>
              {response}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
