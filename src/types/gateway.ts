// OpenClaw Gateway Protocol v3 Types

export interface GatewayRequest {
  type: "req";
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface GatewayResponse {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code: string; message: string };
}

export interface GatewayEvent {
  type: "event";
  event: string;
  payload: unknown;
  seq?: number;
}

export type GatewayFrame = GatewayRequest | GatewayResponse | GatewayEvent;

export interface ConnectParams {
  minProtocol: number;
  maxProtocol: number;
  client: {
    id: string;
    version: string;
    platform?: string;
    mode?: string;
  };
  role?: string;
  scopes?: string[];
  caps?: string[];
  auth?: {
    token?: string;
    password?: string;
  };
}

export interface HelloOkPayload {
  protocol: number;
  auth?: { deviceToken: string };
  tickIntervalMs?: number;
}

// Agent Types
export interface Agent {
  id: string;
  name: string;
  emoji?: string;
  model?: string;
  provider?: string;
  status: "online" | "offline" | "busy" | "error";
  enabled: boolean;
  lastSeen?: string;
  heartbeatInterval?: string;
  description?: string;
  channels?: string[];
  tools?: AgentToolPolicy;
  sandbox?: boolean;
}

export interface AgentToolPolicy {
  allow?: string[];
  deny?: string[];
}

export interface AgentFile {
  name: string;
  content: string;
}

export type AgentFileName =
  | "AGENTS.md"
  | "SOUL.md"
  | "IDENTITY.md"
  | "USER.md"
  | "TOOLS.md"
  | "HEARTBEAT.md"
  | "MEMORY.md";

// Session Types
export interface Session {
  id: string;
  agentId: string;
  model?: string;
  thinkingLevel?: string;
  createdAt: string;
  lastMessageAt?: string;
  messageCount: number;
  status: "active" | "idle" | "closed";
}

// Cron Types
export interface CronJob {
  id: string;
  agentId?: string;
  expression: string;
  description?: string;
  enabled: boolean;
  wakeMode: "now" | "next-heartbeat";
  deliveryMode: "announce" | "none";
  lastRun?: string;
  nextRun?: string;
  sessionIsolation?: boolean;
  model?: string;
  prompt?: string;
}

// Task Types
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "inbox" | "up_next" | "in_progress" | "in_review" | "done" | "planning" | "assigned" | "testing";
  agentId?: string;
  priority?: "low" | "medium" | "high" | "critical";
  createdAt: string;
  updatedAt?: string;
  dueDate?: string;
  tags?: string[];
}

// Memory Types
export interface MemoryEntry {
  id: string;
  agentId: string;
  content: string;
  type: "fact" | "preference" | "decision" | "note";
  createdAt: string;
  source?: string;
}

// Skill Types
export interface Skill {
  name: string;
  description?: string;
  path: string;
  tags?: string[];
  source: "bundled" | "workspace" | "managed";
}

// Config Types
export interface GatewayConfig {
  gateway?: {
    port?: number;
    auth?: {
      mode?: "token" | "password" | "none";
    };
    controlUi?: {
      basePath?: string;
    };
  };
  agents?: Record<string, AgentConfig>;
  [key: string]: unknown;
}

export interface AgentConfig {
  name?: string;
  emoji?: string;
  model?: string;
  provider?: string;
  enabled?: boolean;
  heartbeat?: {
    every?: string;
  };
  channels?: string[];
  tools?: AgentToolPolicy;
  sandbox?: boolean;
  [key: string]: unknown;
}

// Log Types
export interface LogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  source?: string;
  agentId?: string;
  meta?: Record<string, unknown>;
}

// Dashboard Stats
export interface DashboardStats {
  totalAgents: number;
  onlineAgents: number;
  activeSessions: number;
  totalCronJobs: number;
  activeCronJobs: number;
  totalTasks: number;
  pendingTasks: number;
}

// Connection state
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface GatewayConnection {
  url: string;
  token?: string;
  status: ConnectionStatus;
  error?: string;
  lastConnected?: string;
}
