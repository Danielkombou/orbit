"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Settings {
  defaultModel: string;
  voiceEnabled: boolean;
  theme: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    defaultModel: "gpt-4o",
    voiceEnabled: true,
    theme: "dark",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          defaultModel: data.defaultModel || "gpt-4o",
          voiceEnabled: data.voiceEnabled ?? true,
          theme: data.theme || "dark",
        });
      }
    } catch {
      console.error("Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("Settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your preferences.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">AI Preferences</h2>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Default Model
            </label>
            <select
              value={settings.defaultModel}
              onChange={(e) =>
                setSettings((s) => ({ ...s, defaultModel: e.target.value }))
              }
              className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="claude-sonnet-4-20250514">Claude Sonnet</option>
              <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
            </select>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Voice</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Voice Interface</p>
              <p className="text-xs text-muted-foreground">
                Enable voice input and output
              </p>
            </div>
            <button
              onClick={() =>
                setSettings((s) => ({ ...s, voiceEnabled: !s.voiceEnabled }))
              }
              className={`w-10 h-6 rounded-full transition-colors ${
                settings.voiceEnabled ? "bg-primary" : "bg-muted border border-border"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${
                  settings.voiceEnabled ? "translate-x-4" : ""
                }`}
              />
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Appearance</h2>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Theme</label>
            <select
              value={settings.theme}
              onChange={(e) =>
                setSettings((s) => ({ ...s, theme: e.target.value }))
              }
              className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
        </section>
      </div>
    </div>
  );
}
