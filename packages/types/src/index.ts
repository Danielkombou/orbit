export interface HealthResponse {
  status: "ok" | "error";
  timestamp: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  model: string;
  systemPrompt?: string;
  capabilities: string[];
}

export interface AgentMessage {
  id: string;
  agentId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
}
