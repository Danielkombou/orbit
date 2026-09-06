"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2, Volume2, X, Square } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8000";

interface VoiceMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export default function VoiceUIPage() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      mediaRecorderRef.current?.stop();
      abortRef.current?.abort();
    };
  }, []);

  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setIsSpeaking(false);
  }, []);

  const cancelAll = useCallback(() => {
    mediaRecorderRef.current?.stop();
    abortRef.current?.abort();
    audioRef.current?.pause();
    audioRef.current = null;
    setIsListening(false);
    setIsProcessing(false);
    setIsSpeaking(false);
  }, []);

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
      // TTS is optional
    }
  }, []);

  const stopListening = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    setTranscript("");
    setResponse("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];

      const controller = new AbortController();
      abortRef.current = controller;

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsProcessing(true);

        try {
          // 1. Transcribe
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

          setMessages((prev) => [...prev, { role: "user", content: text, timestamp: Date.now() }]);

          // 2. Agent via streaming
          setResponse("");
          const agentRes = await fetch(`${AGENT_URL}/agent/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task: text }),
            signal: controller.signal,
          });

          if (!agentRes.ok) {
            toast.error("Agent is not available");
            setIsProcessing(false);
            return;
          }

          const agentData = (await agentRes.json()) as { answer: string };
          setResponse(agentData.answer);
          setMessages((prev) => [...prev, { role: "assistant", content: agentData.answer, timestamp: Date.now() }]);

          // 3. TTS
          if (!controller.signal.aborted) {
            await playAudio(agentData.answer);
          }
        } catch (err: any) {
          if (err?.name !== "AbortError") {
            toast.error("Failed to process voice");
          }
        } finally {
          setIsProcessing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsListening(true);

      // Auto-stop after 10 seconds (longer than before)
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
          setIsListening(false);
        }
      }, 10000);
    } catch {
      toast.error("Microphone access denied");
    }
  }, [playAudio, stopSpeaking, isSpeaking]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-semibold">Voice Interface</h1>
        <p className="text-xs text-muted-foreground">
          Speak naturally to your AI assistant. Tap to speak, tap again to stop.
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Mic button */}
        <div className="relative mb-8">
          <button
            onClick={startListening}
            disabled={isProcessing}
            className={`w-28 h-28 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? "bg-red-500/20 border-2 border-red-500 animate-pulse"
                : "bg-primary/20 border-2 border-primary hover:bg-primary/30"
            } disabled:opacity-50`}
          >
            {isProcessing ? (
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            ) : isListening ? (
              <MicOff className="w-12 h-12 text-red-500" />
            ) : (
              <Mic className="w-12 h-12 text-primary" />
            )}
          </button>
          {isListening && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
              <span className="text-xs text-red-500 animate-pulse">
                Listening... (10s max)
              </span>
            </div>
          )}
        </div>

        {/* Status */}
        <p className="text-sm text-muted-foreground mt-6 mb-4">
          {isListening
            ? "Listening..."
            : isProcessing
            ? "Processing..."
            : isSpeaking
            ? "Speaking..."
            : "Tap to speak"}
        </p>

        {/* Stop buttons */}
        {(isProcessing || isSpeaking) && (
          <div className="flex gap-3 mb-4">
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 text-red-500 text-xs hover:bg-red-500/30 transition-colors"
              >
                <Square className="w-3 h-3" />
                Stop Speaking
              </button>
            )}
            {isProcessing && (
              <button
                onClick={cancelAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 text-red-500 text-xs hover:bg-red-500/30 transition-colors"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            )}
          </div>
        )}

        {/* Conversation */}
        <div className="w-full max-w-md space-y-3 mt-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg text-sm ${
                msg.role === "user"
                  ? "bg-muted ml-8"
                  : "bg-primary/10 mr-8"
              }`}
            >
              <span className="text-xs text-muted-foreground block mb-1">
                {msg.role === "user" ? "You" : "ORBIT"}
                {msg.role === "assistant" && isSpeaking && i === messages.length - 1 && (
                  <Volume2 className="w-3 h-3 inline ml-1 animate-pulse" />
                )}
              </span>
              {msg.content}
            </div>
          ))}

          {/* Current transcript/response */}
          {!messages.length && transcript && (
            <div className="p-3 rounded-lg bg-muted text-sm ml-8">
              <span className="text-xs text-muted-foreground block mb-1">You said:</span>
              {transcript}
            </div>
          )}
          {!messages.length && response && (
            <div className="p-3 rounded-lg bg-primary/10 text-sm mr-8">
              <span className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                ORBIT
                {isSpeaking && <Volume2 className="w-3 h-3 animate-pulse" />}
              </span>
              {response}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
