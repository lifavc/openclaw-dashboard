import type {
  GatewayFrame,
  GatewayRequest,
  GatewayEvent,
  ConnectParams,
  HelloOkPayload,
  ConnectionStatus,
  Agent,
  AgentFile,
  AgentFileName,
  Session,
  CronJob,
  GatewayConfig,
  LogEntry,
  Skill,
  ChatMessage,
  ExecApproval,
  GatewayHealth,
  MemoryEntry,
} from "@/types/gateway";

type EventHandler = (event: GatewayEvent) => void;
type StatusHandler = (status: ConnectionStatus, error?: string) => void;

export class GatewayClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private requestId = 0;
  private pendingRequests = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private statusHandlers = new Set<StatusHandler>();
  private _status: ConnectionStatus = "disconnected";
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private deviceToken: string | null = null;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  get gatewayUrl(): string {
    return this.url;
  }

  private setStatus(status: ConnectionStatus, error?: string) {
    this._status = status;
    this.statusHandlers.forEach((h) => h(status, error));
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    return () => this.eventHandlers.get(event)?.delete(handler);
  }

  connect(): Promise<HelloOkPayload> {
    return new Promise((resolve, reject) => {
      if (this.ws) {
        this.ws.close();
      }

      this.setStatus("connecting");

      try {
        this.ws = new WebSocket(this.url);
      } catch (err) {
        this.setStatus("error", String(err));
        reject(err);
        return;
      }

      this.ws.onopen = () => {
        const connectParams: ConnectParams = {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: "cli",
            version: "1.0.0",
            platform: "macos",
            mode: "cli",
          },
          role: "operator",
          scopes: ["operator.read", "operator.write"],
          caps: [],
          auth: { token: this.token },
        };

        this.send("connect", connectParams as unknown as Record<string, unknown>)
          .then((payload) => {
            const hello = payload as HelloOkPayload;
            this.deviceToken = hello.auth?.deviceToken ?? null;
            this.setStatus("connected");
            this.reconnectAttempts = 0;
            resolve(hello);
          })
          .catch((err) => {
            this.setStatus("error", err.message);
            reject(err);
          });
      };

      this.ws.onmessage = (event) => {
        try {
          const frame: GatewayFrame = JSON.parse(event.data as string);
          this.handleFrame(frame);
        } catch {
          // ignore malformed frames
        }
      };

      this.ws.onclose = () => {
        if (this._status === "connected") {
          this.setStatus("disconnected");
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this.setStatus("error", "WebSocket error");
        this.scheduleReconnect();
      };
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus("disconnected");
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {});
    }, delay);
  }

  private handleFrame(frame: GatewayFrame) {
    if (frame.type === "res") {
      const pending = this.pendingRequests.get(frame.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.delete(frame.id);
        if (frame.ok) {
          pending.resolve(frame.payload);
        } else {
          pending.reject(
            new Error(frame.error?.message ?? "Unknown gateway error")
          );
        }
      }
    } else if (frame.type === "event") {
      const handlers = this.eventHandlers.get(frame.event);
      if (handlers) {
        handlers.forEach((h) => h(frame));
      }
      const wildcardHandlers = this.eventHandlers.get("*");
      if (wildcardHandlers) {
        wildcardHandlers.forEach((h) => h(frame));
      }
    }
  }

  async send(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const id = String(++this.requestId);
    const req: GatewayRequest = { type: "req", id, method, params };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }, 30000);

      this.pendingRequests.set(id, { resolve, reject, timer });

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(req));
      } else {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(new Error("WebSocket not connected"));
      }
    });
  }

  // ─── High-level API methods ─────────────────────────────

  async getConfig(): Promise<GatewayConfig> {
    return (await this.send("config.get")) as GatewayConfig;
  }

  async patchConfig(patch: Record<string, unknown>, baseHash?: string): Promise<void> {
    await this.send("config.patch", { patch, baseHash });
  }

  async applyConfig(raw: string, baseHash: string, note?: string): Promise<void> {
    await this.send("config.apply", { raw, baseHash, note });
  }

  async listAgents(): Promise<Agent[]> {
    return (await this.send("agents.list")) as Agent[];
  }

  async getAgentFile(agentId: string, fileName: AgentFileName): Promise<AgentFile> {
    return (await this.send("agents.files.get", { agentId, fileName })) as AgentFile;
  }

  async setAgentFile(agentId: string, fileName: AgentFileName, content: string): Promise<void> {
    await this.send("agents.files.set", { agentId, fileName, content });
  }

  async listSessions(): Promise<Session[]> {
    return (await this.send("sessions.list")) as Session[];
  }

  async patchSession(sessionId: string, patch: Record<string, unknown>): Promise<void> {
    await this.send("sessions.patch", { sessionId, ...patch });
  }

  async getSessionHistory(sessionId: string, limit?: number): Promise<ChatMessage[]> {
    return (await this.send("sessions.history", { sessionId, limit })) as ChatMessage[];
  }

  async listCronJobs(): Promise<CronJob[]> {
    return (await this.send("cron.list")) as CronJob[];
  }

  async runCronJob(jobId: string): Promise<void> {
    await this.send("cron.run", { jobId });
  }

  async removeCronJob(jobId: string): Promise<void> {
    await this.send("cron.remove", { jobId });
  }

  async enableCronJob(jobId: string): Promise<void> {
    await this.send("cron.enable", { jobId });
  }

  async disableCronJob(jobId: string): Promise<void> {
    await this.send("cron.disable", { jobId });
  }

  async sendChat(agentId: string, message: string): Promise<unknown> {
    return await this.send("chat.send", { agentId, message });
  }

  async getChatHistory(agentId: string, limit?: number): Promise<ChatMessage[]> {
    return (await this.send("chat.history", { agentId, limit })) as ChatMessage[];
  }

  async abortChat(agentId: string): Promise<void> {
    await this.send("chat.abort", { agentId });
  }

  async tailLogs(filter?: Record<string, unknown>): Promise<LogEntry[]> {
    return (await this.send("logs.tail", filter)) as LogEntry[];
  }

  async listSkills(): Promise<Skill[]> {
    return (await this.send("skills.list")) as Skill[];
  }

  async triggerAgent(agentId: string, message?: string): Promise<void> {
    await this.send("chat.send", { agentId, message: message ?? "Wake up — triggered from dashboard" });
  }

  async pauseAgent(agentId: string): Promise<void> {
    await this.send("config.patch", {
      patch: { agents: { [agentId]: { enabled: false } } },
    });
  }

  async resumeAgent(agentId: string): Promise<void> {
    await this.send("config.patch", {
      patch: { agents: { [agentId]: { enabled: true } } },
    });
  }

  // ─── New API methods ───────────────────────────────────

  async resolveApproval(approvalId: string, decision: "approve" | "deny"): Promise<void> {
    await this.send("exec.approval.resolve", { approvalId, decision });
  }

  async listApprovals(): Promise<ExecApproval[]> {
    return (await this.send("exec.approvals.list")) as ExecApproval[];
  }

  async searchMemory(agentId: string, query: string, limit?: number): Promise<MemoryEntry[]> {
    return (await this.send("memory.search", { agentId, query, limit })) as MemoryEntry[];
  }

  async getHealth(): Promise<GatewayHealth> {
    try {
      const httpUrl = this.url.replace(/^ws/, "http").replace(/\/$/, "");
      const res = await fetch(`${httpUrl}/health`, {
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return (await res.json()) as GatewayHealth;
    } catch {
      // fall through
    }
    return { ok: this._status === "connected" };
  }
}
