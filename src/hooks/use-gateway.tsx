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
  patchConfig: (patch: Record<string, unknown>) => Promise<void>;
  createTask: (task: Partial<Task>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
}

type GatewayContextType = GatewayState & GatewayActions;

const GatewayContext = createContext<GatewayContextType | null>(null);

const SETTINGS_KEY = "openclaw-dashboard-settings";

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

const defaultStats: DashboardStats = {
  totalAgents: 0,
  onlineAgents: 0,
  activeSessions: 0,
  totalCronJobs: 0,
  activeCronJobs: 0,
  totalTasks: 0,
  pendingTasks: 0,
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stats: DashboardStats = {
    totalAgents: agents.length,
    onlineAgents: agents.filter((a) => a.status === "online" || a.status === "busy").length,
    activeSessions: sessions.filter((s) => s.status === "active").length,
    totalCronJobs: cronJobs.length,
    activeCronJobs: cronJobs.filter((c) => c.enabled).length,
    totalTasks: tasks.length,
    pendingTasks: tasks.filter((t) => t.status !== "done").length,
  };

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

      // Skills may not be available in all gateway versions
      try {
        const skillsList = await client.listSkills();
        setSkills(skillsList);
      } catch {}

      // Fetch logs
      try {
        const logEntries = await client.tailLogs({ limit: 100 });
        setLogs(logEntries);
      } catch {}
    } catch (err) {
      console.error("Refresh failed:", err);
    }
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

      // Listen for real-time events
      client.on("*", (event) => {
        if (
          event.event.startsWith("agent.") ||
          event.event.startsWith("session.") ||
          event.event === "heartbeat"
        ) {
          refresh();
        }

        if (event.event === "log") {
          setLogs((prev) => [...prev.slice(-199), event.payload as LogEntry]);
        }
      });

      try {
        await client.connect();
        saveSettings(url, token);
        await refresh();

        // Start polling every 15s for live data
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(refresh, 15000);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        throw err;
      }
    },
    [refresh]
  );

  const disconnectFn = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    clientRef.current?.disconnect();
    clientRef.current = null;
    setStatus("disconnected");
    setAgents([]);
    setSessions([]);
    setCronJobs([]);
    setConfig(null);
    setLogs([]);
    setSkills([]);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    const saved = loadSettings();
    if (saved?.url && saved?.token) {
      connectFn(saved.url, saved.token).catch(() => {});
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [connectFn]);

  const triggerAgent = useCallback(async (agentId: string, message?: string) => {
    await clientRef.current?.triggerAgent(agentId, message);
    await refresh();
  }, [refresh]);

  const pauseAgent = useCallback(async (agentId: string) => {
    await clientRef.current?.pauseAgent(agentId);
    await refresh();
  }, [refresh]);

  const resumeAgent = useCallback(async (agentId: string) => {
    await clientRef.current?.resumeAgent(agentId);
    await refresh();
  }, [refresh]);

  const runCronJob = useCallback(async (jobId: string) => {
    await clientRef.current?.runCronJob(jobId);
    await refresh();
  }, [refresh]);

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
    await refresh();
  }, [refresh]);

  const getAgentFile = useCallback(async (agentId: string, fileName: AgentFileName) => {
    const file = await clientRef.current?.getAgentFile(agentId, fileName);
    return file?.content ?? "";
  }, []);

  const setAgentFile = useCallback(async (agentId: string, fileName: AgentFileName, content: string) => {
    await clientRef.current?.setAgentFile(agentId, fileName, content);
  }, []);

  const sendChat = useCallback(async (agentId: string, message: string) => {
    return await clientRef.current?.sendChat(agentId, message);
  }, []);

  const patchConfigFn = useCallback(async (patch: Record<string, unknown>) => {
    await clientRef.current?.patchConfig(patch);
    await refresh();
  }, [refresh]);

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
    };
    setTasks((prev) => [...prev, newTask]);
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t))
    );
  }, []);

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
        patchConfig: patchConfigFn,
        createTask,
        updateTask,
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
