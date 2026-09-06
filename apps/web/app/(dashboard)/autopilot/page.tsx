"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Rocket,
  Calendar,
  Search,
  CheckCircle,
  FileText,
  AlertTriangle,
  Loader2,
  Clock,
  BookOpen,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface AutopilotEvent {
  type: string;
  step?: number;
  max?: number;
  delta?: string;
  name?: string;
  args?: Record<string, unknown>;
  result?: string;
  answer?: string;
  success?: boolean;
  message?: string;
}

const STEPS = [
  { icon: Search, label: "Gathering context", color: "text-blue-400" },
  { icon: Search, label: "Researching deadlines", color: "text-purple-400" },
  { icon: AlertTriangle, label: "Identifying conflicts", color: "text-yellow-400" },
  { icon: FileText, label: "Building your plan", color: "text-green-400" },
  { icon: CheckCircle, label: "Done", color: "text-primary" },
];

const AUTOPilot_MODES = [
  {
    id: "weekly",
    icon: Calendar,
    title: "Prepare me for next week",
    description: "Full weekly plan with deadlines, schedule, and priorities",
    gradient: "from-primary/20 to-blue-500/10",
  },
  {
    id: "today",
    icon: Clock,
    title: "What do I need to do today?",
    description: "Prioritized daily task list with deadlines",
    gradient: "from-green-500/20 to-emerald-500/10",
  },
  {
    id: "internships",
    icon: Briefcase,
    title: "Find me internships",
    description: "Search for CS internship openings and create application tasks",
    gradient: "from-purple-500/20 to-pink-500/10",
  },
];

export default function AutopilotPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [events, setEvents] = useState<AutopilotEvent[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = useCallback(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [events, streamingText, scrollToBottom]);

  const startAutopilot = useCallback((mode: string) => {
    if (isRunning) return;

    setIsRunning(true);
    setEvents([]);
    setStreamingText("");
    setCurrentStep(0);
    setCompletedSteps(new Set());

    const prompts: Record<string, string> = {
      weekly: "Prepare me for next week. Check my existing tasks, notes, and memories. Search for upcoming academic deadlines, career fairs, and university events. Create a comprehensive weekly schedule with day-by-day breakdown. Create tasks for each deadline. Save the plan as a note.",
      today: "What do I need to do today? Check my tasks, notes, and memories. Search for any deadlines I might be missing. Create a prioritized today list.",
      internships: "Find me internship opportunities. Search the web for current CS internship openings. Create tasks for the best ones with application deadlines. Remember the top 3 picks.",
    };

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.hostname}:8000/ws/agent`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ task: prompts[mode] || prompts.weekly }));
    };

    ws.onmessage = (e) => {
      try {
        const data: AutopilotEvent = JSON.parse(e.data);

        if (data.type === "text_delta") {
          setStreamingText((prev) => prev + (data.delta || ""));
          return;
        }

        if (data.type === "tool_call") {
          setStreamingText("");
          setEvents((prev) => [...prev, data]);

          // Map tool calls to autopilot steps
          const name = data.name || "";
          if (name.startsWith("list_") || name === "recall") {
            setCurrentStep(0);
          } else if (name === "search_web" || name === "open_website") {
            setCurrentStep(1);
          } else if (name === "create_task") {
            setCurrentStep(3);
          } else if (name === "create_note") {
            setCurrentStep(3);
          }
          return;
        }

        if (data.type === "tool_result") {
          setEvents((prev) => [...prev, data]);
          return;
        }

        if (data.type === "step_start") {
          if (data.step && data.step > 1) {
            setCompletedSteps((prev) => new Set(prev).add(currentStep));
          }
          setEvents((prev) => [...prev, data]);
          return;
        }

        if (data.type === "done") {
          setStreamingText("");
          setCurrentStep(4);
          setCompletedSteps(new Set([0, 1, 2, 3]));
          setEvents((prev) => [...prev, data]);
          setIsRunning(false);
          toast.success("Autopilot complete! Your week is planned.");
          return;
        }

        if (data.type === "error") {
          setStreamingText("");
          setEvents((prev) => [...prev, data]);
          setIsRunning(false);
          toast.error(data.message || "Autopilot error");
          return;
        }

        setEvents((prev) => [...prev, data]);
      } catch {}
    };

    ws.onerror = () => {
      setIsRunning(false);
      toast.error("Connection error. Is the agent running?");
    };

    ws.onclose = () => setIsRunning(false);
  }, [isRunning, currentStep]);

  const stopAutopilot = useCallback(() => {
    wsRef.current?.close();
    setIsRunning(false);
    toast.info("Autopilot stopped");
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Student Autopilot</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          One command to organize your life. ORBIT handles the boring stuff.
        </p>
      </div>

      {!isRunning && events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center mb-8">
            <Rocket className="w-16 h-16 text-primary/30 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">What do you need?</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Pick a command and ORBIT will handle everything — checking your tasks,
              researching deadlines, and building your plan.
            </p>
          </div>

          <div className="grid gap-4 w-full max-w-lg">
            {AUTOPilot_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => startAutopilot(mode.id)}
                className={`flex items-start gap-4 p-4 rounded-xl border border-border bg-gradient-to-r ${mode.gradient} hover:border-primary/50 transition-all text-left group`}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <mode.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{mode.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{mode.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground mt-3 group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Progress steps */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-1">
              {STEPS.map((step, i) => (
                <div key={i} className="flex items-center">
                  <div
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all ${
                      i === currentStep
                        ? "bg-primary/20 text-primary"
                        : completedSteps.has(i)
                        ? "bg-primary/10 text-primary/60"
                        : "text-muted-foreground/40"
                    }`}
                  >
                    {i < currentStep || completedSteps.has(i) ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : i === currentStep ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <step.icon className="w-3 h-3" />
                    )}
                    <span className="hidden sm:inline">{step.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-muted-foreground/20 mx-0.5" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Event feed */}
          <ScrollArea className="flex-1 p-4">
            {/* Streaming text */}
            {streamingText && (
              <div className="mb-3 p-3 rounded-lg bg-muted/30 text-sm">
                <p className="whitespace-pre-wrap">{streamingText}</p>
              </div>
            )}

            {/* Tool call events */}
            {events.map((event, i) => {
              if (event.type === "tool_call") {
                const icon = event.name?.startsWith("search") ? (
                  <Search className="w-3 h-3" />
                ) : event.name?.startsWith("create_task") ? (
                  <CheckCircle className="w-3 h-3" />
                ) : event.name?.startsWith("create_note") ? (
                  <FileText className="w-3 h-3" />
                ) : event.name?.startsWith("recall") || event.name?.startsWith("list") ? (
                  <BookOpen className="w-3 h-3" />
                ) : (
                  <Loader2 className="w-3 h-3" />
                );

                return (
                  <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/30 mb-1">
                    {icon}
                    <span className="text-xs font-mono text-primary">{event.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {event.args ? JSON.stringify(event.args).slice(0, 60) : ""}
                    </span>
                  </div>
                );
              }

              if (event.type === "tool_result") {
                return null; // Collapsed for cleanliness
              }

              if (event.type === "done") {
                return (
                  <div key={i} className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-primary" />
                      <span className="text-sm font-semibold">Plan Ready</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{event.answer}</p>
                  </div>
                );
              }

              if (event.type === "error") {
                return (
                  <div key={i} className="p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
                    {event.message}
                  </div>
                );
              }

              return null;
            })}

            {isRunning && !streamingText && (
              <div className="flex items-center gap-2 py-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Working...</span>
              </div>
            )}

            <div ref={eventsEndRef} />
          </ScrollArea>

          {/* Stop button */}
          {isRunning && (
            <div className="p-4 border-t border-border flex justify-center">
              <Button variant="destructive" onClick={stopAutopilot}>
                Stop Autopilot
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
