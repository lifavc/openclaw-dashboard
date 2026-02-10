"use client";

import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { GatewayClient } from "@/lib/gateway-client";
import type {
  ConnectionStatus,
  Agent,
  Session,
  CronJob,
  GatewayConfig,
  LogEntry,
  Skill,
  Task,
  DashboardStats,
  AgentFileName,
  ExecApproval,
  ActivityEvent,
  GatewayHealth,
  Toast,
  ChatMessage,
  MemoryEntry,
  GatewayEvent,
} from "@/types/gateway";

interface GatewayState {
  status: ConnectionStatus;
  error: string | null;
  agents: Agent[];
  sessions: Session[];
  cronJobs: CronJob[];
  config: GatewayConfig | null;
  logs: LogEntry[];
  skills: Skill[];
  tasks: Task[];
  stats: DashboardStats;
  approvals: ExecApproval[];
  activityFeed: ActivityEvent[];
  health: GatewayHealth | null;
  toasts: Toast[];
}

interface GatewayActions {
  connect: (url: string, token: string) => Promise<void>;
  disconnect: () => void;
  refresh: () => Promise<void>;
  triggerAgent: (agentId: string, message?: string) => Promise<void>;
  pauseAgent: (agentId: string) => Promise<void>;
  resumeAgent: (agentId: string) => Promise<void>;
  runCronJob: (jobId: string) => Promise<void>;
  enableCronJob: (jobId: string) => Promise<void>;
  disableCronJob: (jobId: string) => Promise<void>;
  removeCronJob: (jobId: string) => Promise<void>;
  getAgentFile: (agentId: string, fileName: AgentFileName) => Promise<string>;
  setAgentFile: (agentId: string, fileName: AgentFileName, content: string) => Promise<void>;
  sendChat: (agentId: string, message: string) => Promise<unknown>;
  getChatHistory: (agentId: string, limit?: number) => Promise<ChatMessage[]>;
  getSessionHistory: (sessionId: string, limit?: number) => Promise<ChatMessage[]>;
  patchConfig: (patch: Record<string, unknown>) => Promise<void>;
  createTask: (task: Partial<Task>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  resolveApproval: (id: string, decision: "approve" | "deny") => Promise<void>;
  addToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  searchMemory: (agentId: string, query: string) => Promise<MemoryEntry[]>;
  getClient: () => GatewayClient | null;
}

type GatewayContextType = GatewayState & GatewayActions;

const GatewayContext = createContext<GatewayContextType | null>(null);

const SETTINGS_KEY = "openclaw-dashboard-settings";
const TASKS_KEY = "openclaw-dashboard-tasks";

function loadSettings(): { url: string; token: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveSettings(url: string, token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ url, token }));
}

function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveTasks(tasks: Task[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

const defaultStats: DashboardStats = {
  totalAgents: 0,
  onlineAgents: 0,
  activeSessions: 0,
  totalCronJobs: 0,
  activeCronJobs: 0,
  totalTasks: 0,
  pendingTasks: 0,
  pendingApprovals: 0,
};

export function GatewayProvider({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<GatewayClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [config, setConfig] = useState<GatewayConfig | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [approvals, setApprovals] = useState<ExecApproval[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
  const [health, setHealth] = useState<GatewayHealth | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const healthRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted tasks on mount
  useEffect(() => {
    setTasks(loadTasks());
  }, []);

  // Persist tasks on change
  useEffect(() => {
    if (tasks.length > 0) saveTasks(tasks);
  }, [tasks]);

  const stats: DashboardStats = {
    totalAgents: agents.length,
    onlineAgents: agents.filter((a) => a.status === "online" || a.status === "busy").length,
    activeSessions: sessions.filter((s) => s.status === "active").length,
    totalCronJobs: cronJobs.length,
    activeCronJobs: cronJobs.filter((c) => c.enabled).length,
    totalTasks: tasks.length,
    pendingTasks: tasks.filter((t) => t.status !== "done").length,
    pendingApprovals: approvals.filter((a) => a.status === "pending").length,
  };

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration ?? 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushActivity = useCallback((event: ActivityEvent) => {
    setActivityFeed((prev) => [event, ...prev].slice(0, 200));
  }, []);

  const refresh = useCallback(async () => {
    const client = clientRef.current;
    if (!client || client.status !== "connected") return;

    try {
      const [agentsList, sessionsList, cronList, configData] = await Promise.allSettled([
        client.listAgents(),
        client.listSessions(),
        client.listCronJobs(),
        client.getConfig(),
      ]);

      if (agentsList.status === "fulfilled") setAgents(agentsList.value);
      if (sessionsList.status === "fulfilled") setSessions(sessionsList.value);
      if (cronList.status === "fulfilled") setCronJobs(cronList.value);
      if (configData.status === "fulfilled") setConfig(configData.value);

      // Optional endpoints
      try { setSkills(await client.listSkills()); } catch {}
      try { setLogs(await client.tailLogs({ limit: 200 })); } catch {}
      try { setApprovals(await client.listApprovals()); } catch {}
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  }, []);

  const refreshHealth = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    try {
      const h = await client.getHealth();
      setHealth(h);
    } catch {}
  }, []);

  const connectFn = useCallback(
    async (url: string, token: string) => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }

      const client = new GatewayClient(url, token);
      clientRef.current = client;

      client.onStatus((s, e) => {
        setStatus(s);
        setError(e ?? null);
      });

      // Real-time event handling
      client.on("*", (event: GatewayEvent) => {
        // Auto-refresh on important events
        if (
          event.event.startsWith("agent.") ||
          event.event.startsWith("session.") ||
          event.event === "heartbeat"
        ) {
          refresh();
        }

        // Live log events
        if (event.event === "log") {
          setLogs((prev) => [...prev.slice(-199), event.payload as LogEntry]);
        }

        // Exec approval events
        if (event.event === "exec.approval.requested") {
          const approval = event.payload as ExecApproval;
          setApprovals((prev) => [...prev, approval]);
          addToast({
            type: "warning",
            title: "Exec Approval Requested",
            description: `${approval.agentId}: ${approval.command}`,
            duration: 10000,
          });
          pushActivity({
            id: crypto.randomUUID(),
            type: "approval",
            title: "Exec approval requested",
            description: `${approval.agentId} wants to run: ${approval.command}`,
            agentId: approval.agentId,
            timestamp: new Date().toISOString(),
          });
        }

        if (event.event === "exec.approval.resolved") {
          const resolved = event.payload as { approvalId: string; decision: string };
          setApprovals((prev) =>
            prev.map((a) =>
              a.id === resolved.approvalId
                ? { ...a, status: resolved.decision as ExecApproval["status"], resolvedAt: new Date().toISOString() }
                : a
            )
          );
        }

        // Build activity feed from events
        if (event.event.startsWith("agent.")) {
          pushActivity({
            id: crypto.randomUUID(),
            type: "agent",
            title: event.event.replace("agent.", "Agent "),
            description: JSON.stringify(event.payload),
            timestamp: new Date().toISOString(),
            meta: event.payload as Record<string, unknown>,
          });
        }

        if (event.event.startsWith("cron.")) {
          pushActivity({
            id: crypto.randomUUID(),
            type: "cron",
            title: event.event.replace("cron.", "Cron "),
            description: JSON.stringify(event.payload),
            timestamp: new Date().toISOString(),
          });
        }

        if (event.event === "heartbeat") {
          pushActivity({
            id: crypto.randomUUID(),
            type: "system",
            title: "Heartbeat",
            description: "Agent heartbeat received",
            timestamp: new Date().toISOString(),
            meta: event.payload as Record<string, unknown>,
          });
        }
      });

      try {
        await client.connect();
        saveSettings(url, token);
        await refresh();
        await refreshHealth();

        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(refresh, 15000);

        if (healthRef.current) clearInterval(healthRef.current);
        healthRef.current = setInterval(refreshHealth, 30000);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        throw err;
      }
    },
    [refresh, refreshHealth, addToast, pushActivity]
  );

  const disconnectFn = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (healthRef.current) { clearInterval(healthRef.current); healthRef.current = null; }
    clientRef.current?.disconnect();
    clientRef.current = null;
    setStatus("disconnected");
    setAgents([]);
    setSessions([]);
    setCronJobs([]);
    setConfig(null);
    setLogs([]);
    setSkills([]);
    setApprovals([]);
    setHealth(null);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    const saved = loadSettings();
    if (saved?.url && saved?.token) {
      connectFn(saved.url, saved.token).catch(() => {});
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (healthRef.current) clearInterval(healthRef.current);
    };
  }, [connectFn]);

  const triggerAgent = useCallback(async (agentId: string, message?: string) => {
    await clientRef.current?.triggerAgent(agentId, message);
    addToast({ type: "success", title: "Agent triggered", description: agentId });
    await refresh();
  }, [refresh, addToast]);

  const pauseAgent = useCallback(async (agentId: string) => {
    await clientRef.current?.pauseAgent(agentId);
    addToast({ type: "info", title: "Agent paused", description: agentId });
    await refresh();
  }, [refresh, addToast]);

  const resumeAgent = useCallback(async (agentId: string) => {
    await clientRef.current?.resumeAgent(agentId);
    addToast({ type: "success", title: "Agent resumed", description: agentId });
    await refresh();
  }, [refresh, addToast]);

  const runCronJob = useCallback(async (jobId: string) => {
    await clientRef.current?.runCronJob(jobId);
    addToast({ type: "success", title: "Cron job triggered", description: jobId });
    await refresh();
  }, [refresh, addToast]);

  const enableCronJob = useCallback(async (jobId: string) => {
    await clientRef.current?.enableCronJob(jobId);
    await refresh();
  }, [refresh]);

  const disableCronJob = useCallback(async (jobId: string) => {
    await clientRef.current?.disableCronJob(jobId);
    await refresh();
  }, [refresh]);

  const removeCronJob = useCallback(async (jobId: string) => {
    await clientRef.current?.removeCronJob(jobId);
    addToast({ type: "info", title: "Cron job removed", description: jobId });
    await refresh();
  }, [refresh, addToast]);

  const getAgentFile = useCallback(async (agentId: string, fileName: AgentFileName) => {
    const file = await clientRef.current?.getAgentFile(agentId, fileName);
    return file?.content ?? "";
  }, []);

  const setAgentFile = useCallback(async (agentId: string, fileName: AgentFileName, content: string) => {
    await clientRef.current?.setAgentFile(agentId, fileName, content);
    addToast({ type: "success", title: "File saved", description: `${agentId}/${fileName}` });
  }, [addToast]);

  const sendChat = useCallback(async (agentId: string, message: string) => {
    return await clientRef.current?.sendChat(agentId, message);
  }, []);

  const getChatHistory = useCallback(async (agentId: string, limit?: number) => {
    return (await clientRef.current?.getChatHistory(agentId, limit)) ?? [];
  }, []);

  const getSessionHistory = useCallback(async (sessionId: string, limit?: number) => {
    return (await clientRef.current?.getSessionHistory(sessionId, limit)) ?? [];
  }, []);

  const patchConfigFn = useCallback(async (patch: Record<string, unknown>) => {
    await clientRef.current?.patchConfig(patch);
    addToast({ type: "success", title: "Config updated" });
    await refresh();
  }, [refresh, addToast]);

  const resolveApprovalFn = useCallback(async (id: string, decision: "approve" | "deny") => {
    await clientRef.current?.resolveApproval(id, decision);
    addToast({ type: decision === "approve" ? "success" : "warning", title: `Approval ${decision}d` });
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: decision === "approve" ? "approved" : "denied" as const, resolvedAt: new Date().toISOString() } : a))
    );
  }, [addToast]);

  const searchMemory = useCallback(async (agentId: string, query: string) => {
    return (await clientRef.current?.searchMemory(agentId, query)) ?? [];
  }, []);

  const createTask = useCallback((task: Partial<Task>) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: task.title ?? "New Task",
      description: task.description,
      status: task.status ?? "inbox",
      agentId: task.agentId,
      priority: task.priority ?? "medium",
      createdAt: new Date().toISOString(),
      tags: task.tags,
      dueDate: task.dueDate,
    };
    setTasks((prev) => [...prev, newTask]);
    addToast({ type: "success", title: "Task created", description: newTask.title });
  }, [addToast]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t))
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getClient = useCallback(() => clientRef.current, []);

  return (
    <GatewayContext.Provider
      value={{
        status,
        error,
        agents,
        sessions,
        cronJobs,
        config,
        logs,
        skills,
        tasks,
        stats: agents.length > 0 ? stats : defaultStats,
        approvals,
        activityFeed,
        health,
        toasts,
        connect: connectFn,
        disconnect: disconnectFn,
        refresh,
        triggerAgent,
        pauseAgent,
        resumeAgent,
        runCronJob,
        enableCronJob,
        disableCronJob,
        removeCronJob,
        getAgentFile,
        setAgentFile,
        sendChat,
        getChatHistory,
        getSessionHistory,
        patchConfig: patchConfigFn,
        createTask,
        updateTask,
        deleteTask,
        resolveApproval: resolveApprovalFn,
        addToast,
        dismissToast,
        searchMemory,
        getClient,
      }}
    >
      {children}
    </GatewayContext.Provider>
  );
}

export function useGateway(): GatewayContextType {
  const ctx = useContext(GatewayContext);
  if (!ctx) throw new Error("useGateway must be used within GatewayProvider");
  return ctx;
}
