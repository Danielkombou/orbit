"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckSquare, Plus, Trash2, Calendar, AlertCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Task {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-500 bg-red-500/10",
  high: "text-orange-500 bg-orange-500/10",
  medium: "text-yellow-500 bg-yellow-500/10",
  low: "text-green-500 bg-green-500/10",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newDue, setNewDue] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      const res = await fetch(`${API_URL}/api/tasks?${params}`, {
        credentials: "include",
      });
      if (res.ok) setTasks(await res.json());
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const createTask = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          priority: newPriority,
          due_date: newDue || undefined,
        }),
      });
      if (res.ok) {
        setNewTitle(""); setNewDesc(""); setNewPriority("medium"); setNewDue("");
        setShowCreate(false);
        fetchTasks();
      }
    } catch {}
  };

  const completeTask = async (id: number) => {
    await fetch(`${API_URL}/api/tasks/${id}/complete`, {
      method: "PATCH",
      credentials: "include",
    });
    fetchTasks();
  };

  const deleteTask = async (id: number) => {
    await fetch(`${API_URL}/api/tasks/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    fetchTasks();
  };

  const pending = tasks.filter((t) => t.status === "pending");
  const completed = tasks.filter((t) => t.status === "completed");

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Tasks</h1>
          <p className="text-xs text-muted-foreground">
            {pending.length} pending, {completed.length} completed
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg bg-muted p-0.5">
            {(["all", "pending", "completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-xs capitalize transition-colors ${
                  filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3 h-3" /> New Task
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="p-4 border-b border-border bg-muted/30 space-y-3">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Task title..."
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            onKeyDown={(e) => e.key === "Enter" && createTask()}
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)..."
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <input
              type="datetime-local"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs"
            />
            <button
              onClick={createTask}
              className="ml-auto px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs hover:bg-primary/90"
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 space-y-2">
        {loading && (
          <div className="text-center text-sm text-muted-foreground py-8">Loading tasks...</div>
        )}

        {!loading && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No tasks yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Ask ORBIT to create tasks, or add one manually
            </p>
          </div>
        )}

        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-start gap-3 p-3 rounded-lg border border-border ${
              task.status === "completed" ? "opacity-50" : ""
            }`}
          >
            <button
              onClick={() => task.status === "pending" && completeTask(task.id)}
              className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                task.status === "completed"
                  ? "bg-primary border-primary text-white"
                  : "border-muted-foreground/30 hover:border-primary"
              }`}
            >
              {task.status === "completed" && (
                <CheckSquare className="w-3 h-3" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${task.status === "completed" ? "line-through" : ""}`}>
                {task.title}
              </p>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
                  {task.priority}
                </span>
                {task.due_date && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => deleteTask(task.id)}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
