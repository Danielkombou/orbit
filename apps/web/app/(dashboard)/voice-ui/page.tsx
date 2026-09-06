"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send, Loader2 } from "lucide-react";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8000";

export default function VoiceUIPage() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopListening = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    setError("");
    setTranscript("");
    setResponse("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        // In a real implementation, we'd send the audio to the agent
        // For now, we use a text-based approach
        setIsProcessing(true);
        try {
          const res = await fetch(`${AGENT_URL}/agent/voice`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: transcript || "Hello" }),
          });
          if (res.ok) {
            const data = await res.json();
            setResponse(data.answer);
          } else {
            setError("Agent is not available");
          }
        } catch {
          setError("Failed to connect to agent");
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
      setError("Microphone access denied");
    }
  }, [transcript]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <h1 className="text-2xl font-bold mb-2">Voice Interface</h1>
      <p className="text-muted-foreground mb-12">
        Speak naturally to your AI assistant.
      </p>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2 text-sm text-destructive mb-6">
          {error}
        </div>
      )}

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
          : "Tap to speak"}
      </p>

      {(transcript || response || error) && (
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
              <span className="text-xs text-muted-foreground block mb-1">
                ORBIT:
              </span>
              {response}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
