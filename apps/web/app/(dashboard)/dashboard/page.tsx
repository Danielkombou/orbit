"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Mic,
  MicOff,
  Monitor,
  Terminal,
  Globe,
  Eye,
  Loader2,
  StopCircle,
  Calendar,
  Search,
  AlertTriangle,
} from "lucide-react";

interface AgentEvent {
  type: string;
  step?: number;
  max?: number;
  content?: string;
  name?: string;
  args?: Record<string, unknown>;
  result?: string;
  screenshot?: string;
  answer?: string;
  success?: boolean;
  message?: string;
}

const TOOL_ICONS: Record<string, React.ReactNode> = {
  browser_navigate: <Globe className="w-3 h-3" />,
  browser_click: <Eye className="w-3 h-3" />,
  browser_type: <Terminal className="w-3 h-3" />,
  browser_screenshot: <Monitor className="w-3 h-3" />,
  run_command: <Terminal className="w-3 h-3" />,
};

export default function DashboardPage() {
  const [task, setTask] = useState("");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [liveScreenshot, setLiveScreenshot] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const liveWsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const scrollToBottom = useCallback(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [events, scrollToBottom]);

  // Connect to live view WebSocket
  useEffect(() => {
    const connectLive = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = "localhost:8000";
        liveWsRef.current = new WebSocket(`${protocol}//${host}/ws/live`);

        liveWsRef.current.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === "frame" && data.screenshot) {
              setLiveScreenshot(`data:image/png;base64,${data.screenshot}`);
            }
          } catch {}
        };

        liveWsRef.current.onclose = () => setTimeout(connectLive, 3000);
      } catch {}
    };

    connectLive();
    return () => {
      liveWsRef.current?.close();
    };
  }, []);

  const sendTask = useCallback(() => {
    if (!task.trim() || isRunning) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = "localhost:8000";
    const ws = new WebSocket(`${protocol}//${host}/ws/agent`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsRunning(true);
      setEvents([]);
      ws.send(JSON.stringify({ task: task.trim() }));
    };

    ws.onmessage = (e) => {
      try {
        const data: AgentEvent = JSON.parse(e.data);
        setEvents((prev) => [...prev, data]);

        if (data.screenshot) {
          setLiveScreenshot(`data:image/png;base64,${data.screenshot}`);
        }

        if (data.type === "done" || data.type === "error") {
          setIsRunning(false);
        }
      } catch {}
    };

    ws.onerror = () => setIsRunning(false);
    ws.onclose = () => setIsRunning(false);
    setTask("");
  }, [task, isRunning]);

  const stopAgent = useCallback(() => {
    wsRef.current?.close();
    setIsRunning(false);
  }, []);

  const toggleVoice = useCallback(async () => {
    if (isListening) {
      mediaRecorderRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];

      const API_URL = "http://localhost:3001";

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());

        try {
          const audioBlob = new Blob(chunks, { type: "audio/webm" });
          setTask("Transcribing...");

          const res = await fetch(`${API_URL}/api/transcribe`, {
            method: "POST",
            body: audioBlob,
          });

          if (res.ok) {
            const { text } = (await res.json()) as { text: string };
            if (text && text.trim().length > 0) {
              setTask(text);
            } else {
              setTask("");
            }
          } else {
            setTask("");
          }
        } catch {
          setTask("");
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
      console.error("Microphone access denied");
    }
  }, [isListening]);

  const renderEvent = (event: AgentEvent, i: number) => {
    switch (event.type) {
      case "step_start":
        return (
          <div key={i} className="flex items-center gap-2 py-1">
            <Badge variant="outline" className="text-xs">
              Step {event.step}/{event.max}
            </Badge>
          </div>
        );
      case "thought":
        return (
          <div key={i} className="py-1 pl-2 border-l-2 border-primary/30">
            <p className="text-sm text-muted-foreground">{event.content}</p>
          </div>
        );
      case "tool_call":
        return (
          <div key={i} className="flex items-center gap-2 py-1 px-2 bg-muted/50 rounded">
            {event.name && TOOL_ICONS[event.name] ? TOOL_ICONS[event.name] : <Terminal className="w-3 h-3" />}
            <span className="text-xs font-mono text-primary">{event.name ?? "unknown"}</span>
            <span className="text-xs text-muted-foreground truncate">
              {JSON.stringify(event.args).slice(0, 80)}
            </span>
          </div>
        );
      case "tool_result":
        return (
          <div key={i} className="py-1 pl-6">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-hidden max-h-20">
              {typeof event.result === "string"
                ? event.result.slice(0, 200)
                : JSON.stringify(event.result)?.slice(0, 200)}
            </pre>
          </div>
        );
      case "done":
        return (
          <div key={i} className="py-2 px-3 bg-primary/10 rounded-lg mt-2">
            <p className="text-sm font-medium">{event.answer}</p>
            <Badge variant={event.success ? "default" : "destructive"} className="mt-1 text-xs">
              {event.success ? "Completed" : "Stopped"}
            </Badge>
          </div>
        );
      case "error":
        return (
          <div key={i} className="py-2 px-3 bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive">{event.message}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left: Event Feed */}
      <div className="flex-1 flex flex-col border-r border-border">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-semibold">Control Center</h1>
          <p className="text-xs text-muted-foreground">
            Send commands and watch ORBIT work in real-time
          </p>
        </div>

        <ScrollArea className="flex-1 p-4">
          {events.length === 0 && isRunning && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader2 className="w-12 h-12 text-primary/40 mb-4 animate-spin" />
              <p className="text-sm text-muted-foreground">
                Thinking...
              </p>
            </div>
          )}
          {events.length === 0 && !isRunning && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Monitor className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">
                Send a command to get started
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                &quot;Open Google and search for cats&quot;
              </p>
            </div>
          )}
          {events.map((e, i) => renderEvent(e, i))}
          <div ref={eventsEndRef} />
        </ScrollArea>

        {/* Command Input */}
        <div className="p-4 border-t border-border">
          {/* Quick Commands */}
          {events.length === 0 && !isRunning && (
            <div className="flex gap-2 mb-3 flex-wrap">
              <button
                onClick={() => { setTask("Plan my week"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Calendar className="w-3 h-3" /> Plan my week
              </button>
              <button
                onClick={() => { setTask("What am I forgetting?"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <AlertTriangle className="w-3 h-3" /> What am I forgetting?
              </button>
              <button
                onClick={() => { setTask("Find me frontend internships"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Search className="w-3 h-3" /> Internship Scout
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVoice}
              className={isListening ? "text-red-500" : ""}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendTask()}
              placeholder="Tell ORBIT what to do..."
              disabled={isRunning}
              className="flex-1"
            />
            {isRunning ? (
              <Button variant="destructive" size="icon" onClick={stopAgent}>
                <StopCircle className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="icon" onClick={sendTask} disabled={!task.trim()}>
                {isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Right: Live Browser View */}
      <div className="w-[480px] flex flex-col">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            <span className="text-sm font-medium">Live View</span>
          </div>
          {isRunning && (
            <Badge variant="default" className="text-xs animate-pulse">
              LIVE
            </Badge>
          )}
        </div>
        <div className="flex-1 bg-black/50 flex items-center justify-center overflow-hidden">
          {liveScreenshot ? (
            <img
              src={liveScreenshot}
              alt="Live browser view"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-center">
              <Globe className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground/40">
                Browser view will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
