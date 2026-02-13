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
  device?: {
    id: string;
    publicKey: string;
    signature?: string;
    signedAt?: string;
    nonce?: string;
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
  contextUsage?: { used: number; total: number };
  tokenCount?: number;
  version?: string;
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
  key?: string;
  tokenCount?: number;
  label?: string;
}

// Chat Message Types
export interface ChatMessagePart {
  type: "text" | "toolCall" | "toolResult";
  text?: string;
  name?: string;
  arguments?: Record<string, unknown>;
  result?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string | ChatMessagePart[];
  timestamp: string;
  agentId?: string;
  sessionId?: string;
  model?: string;
  tokenCount?: number;
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
  relevance?: number;
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

// Exec Approval Types
export interface ExecApproval {
  id: string;
  agentId: string;
  command: string;
  args?: string[];
  cwd?: string;
  host: "gateway" | "node";
  status: "pending" | "approved" | "denied" | "timeout";
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// Activity Event Types
export interface ActivityEvent {
  id: string;
  type: "agent" | "cron" | "task" | "approval" | "chat" | "system" | "tool" | "error";
  title: string;
  description?: string;
  agentId?: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

// Health Types
export interface GatewayHealth {
  ok: boolean;
  version?: string;
  uptime?: number;
  agents?: number;
  sessions?: number;
  memory?: { rss: number; heapUsed: number; heapTotal: number };
}

// Search Result Types
export interface SearchResult {
  type: "memory" | "session" | "cron" | "config" | "file" | "agent";
  title: string;
  description?: string;
  excerpt?: string;
  agentId?: string;
  id?: string;
  relevance?: number;
}

// Toast Notification Types
export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
  duration?: number;
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
  pendingApprovals: number;
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
