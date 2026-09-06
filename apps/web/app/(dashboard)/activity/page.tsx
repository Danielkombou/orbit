"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, MessageSquare, Mic, FileText, Bot } from "lucide-react";

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  status: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  chat: <MessageSquare className="w-4 h-4" />,
  agent_task: <Bot className="w-4 h-4" />,
  voice: <Mic className="w-4 h-4" />,
  file: <FileText className="w-4 h-4" />,
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/activity?limit=50`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      console.error("Failed to fetch activity");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Activity</h1>
          <p className="text-muted-foreground">
            See what ORBIT has been doing.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchActivity}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading && logs.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16">
          <Bot className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Start a chat or send a command to see activity here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  item.type === "agent_task"
                    ? "bg-primary/10 text-primary"
                    : item.type === "voice"
                    ? "bg-secondary/10 text-secondary"
                    : item.type === "chat"
                    ? "bg-success/10 text-success"
                    : "bg-warning/10 text-warning"
                }`}
              >
                {TYPE_ICONS[item.type] || <Bot className="w-4 h-4" />}
              </div>
              <span className="text-sm flex-1">{item.title}</span>
              <Badge
                variant={
                  item.status === "completed"
                    ? "default"
                    : item.status === "failed"
                    ? "destructive"
                    : "outline"
                }
                className="text-xs"
              >
                {item.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatTime(item.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
