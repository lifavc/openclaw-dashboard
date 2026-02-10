"use client";

import { useMemo } from "react";
import { useGateway } from "@/hooks/use-gateway";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  BarChart3,
  Bot,
  MessageSquare,
  Clock,
  Zap,
  ArrowRight,
  Activity,
  TrendingUp,
  Hash,
} from "lucide-react";
import Link from "next/link";

function BarSegment({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-zinc-400 truncate">{label}</span>
        <span className="font-mono text-zinc-500">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800">
        <div
          className={cn("h-2 rounded-full transition-all", color)}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

export function FleetAnalytics() {
  const { status, agents, sessions, cronJobs, tasks, logs, health } = useGateway();

  const analytics = useMemo(() => {
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter((s) => s.status === "active").length;
    const totalTokens = sessions.reduce((sum, s) => sum + (s.tokenCount ?? 0), 0);
    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);

    // Per-agent session counts
    const agentSessionMap = new Map<string, number>();
    const agentTokenMap = new Map<string, number>();
    const agentMessageMap = new Map<string, number>();
    sessions.forEach((s) => {
      agentSessionMap.set(s.agentId, (agentSessionMap.get(s.agentId) ?? 0) + 1);
      agentTokenMap.set(s.agentId, (agentTokenMap.get(s.agentId) ?? 0) + (s.tokenCount ?? 0));
      agentMessageMap.set(s.agentId, (agentMessageMap.get(s.agentId) ?? 0) + s.messageCount);
    });

    // Log level breakdown
    const logLevels = { debug: 0, info: 0, warn: 0, error: 0 };
    logs.forEach((l) => {
      if (l.level in logLevels) logLevels[l.level]++;
    });

    // Task status breakdown
    const taskStatusCounts: Record<string, number> = {};
    tasks.forEach((t) => {
      taskStatusCounts[t.status] = (taskStatusCounts[t.status] ?? 0) + 1;
    });

    // Cron stats
    const enabledCrons = cronJobs.filter((c) => c.enabled).length;
    const cronByAgent = new Map<string, number>();
    cronJobs.forEach((c) => {
      if (c.agentId) {
        cronByAgent.set(c.agentId, (cronByAgent.get(c.agentId) ?? 0) + 1);
      }
    });

    return {
      totalSessions,
      activeSessions,
      totalTokens,
      totalMessages,
      agentSessionMap,
      agentTokenMap,
      agentMessageMap,
      logLevels,
      taskStatusCounts,
      enabledCrons,
      cronByAgent,
    };
  }, [sessions, logs, tasks, cronJobs]);

  if (status !== "connected") {
    return (
      <EmptyState
        icon={BarChart3}
        title="Not Connected"
        description="Connect to your gateway to see fleet analytics."
        action={
          <Link href="/settings">
            <Button variant="primary" icon={ArrowRight}>Settings</Button>
          </Link>
        }
      />
    );
  }

  const maxSessions = Math.max(...Array.from(analytics.agentSessionMap.values()), 1);
  const maxTokens = Math.max(...Array.from(analytics.agentTokenMap.values()), 1);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fleet Analytics</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Usage metrics and health insights across your agent fleet
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Sessions"
          value={analytics.totalSessions}
          icon={MessageSquare}
          subtitle={`${analytics.activeSessions} active`}
          accentColor="text-cyan-400"
        />
        <StatCard
          label="Total Messages"
          value={analytics.totalMessages.toLocaleString()}
          icon={Hash}
          subtitle="Across all sessions"
          accentColor="text-violet-400"
        />
        <StatCard
          label="Total Tokens"
          value={
            analytics.totalTokens > 1_000_000
              ? `${(analytics.totalTokens / 1_000_000).toFixed(1)}M`
              : analytics.totalTokens > 1_000
              ? `${(analytics.totalTokens / 1_000).toFixed(1)}K`
              : String(analytics.totalTokens)
          }
          icon={Zap}
          subtitle="Estimated usage"
          accentColor="text-amber-400"
        />
        <StatCard
          label="Memory Usage"
          value={
            health?.memory
              ? `${(health.memory.heapUsed / 1024 / 1024).toFixed(0)}MB`
              : "—"
          }
          icon={Activity}
          subtitle={
            health?.memory
              ? `${(health.memory.heapTotal / 1024 / 1024).toFixed(0)}MB total`
              : "No data"
          }
          accentColor="text-emerald-400"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sessions per agent */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold">Sessions per Agent</h2>
            </div>
          </CardHeader>
          <CardContent>
            {agents.length === 0 ? (
              <p className="text-xs text-zinc-500">No agents</p>
            ) : (
              <div className="space-y-3">
                {agents.map((agent) => (
                  <BarSegment
                    key={agent.id}
                    label={`${agent.emoji ?? "🤖"} ${agent.name || agent.id}`}
                    value={analytics.agentSessionMap.get(agent.id) ?? 0}
                    max={maxSessions}
                    color="bg-emerald-500"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Token usage per agent */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold">Token Usage per Agent</h2>
            </div>
          </CardHeader>
          <CardContent>
            {agents.length === 0 ? (
              <p className="text-xs text-zinc-500">No agents</p>
            ) : (
              <div className="space-y-3">
                {agents.map((agent) => {
                  const tokens = analytics.agentTokenMap.get(agent.id) ?? 0;
                  return (
                    <BarSegment
                      key={agent.id}
                      label={`${agent.emoji ?? "🤖"} ${agent.name || agent.id}`}
                      value={tokens}
                      max={maxTokens}
                      color="bg-amber-500"
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Log level breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-semibold">Log Level Breakdown</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {(["error", "warn", "info", "debug"] as const).map((level) => {
                const count = analytics.logLevels[level];
                const total = Object.values(analytics.logLevels).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((count / total) * 100).toFixed(0) : "0";
                const colors = {
                  error: "text-red-400 bg-red-400/10",
                  warn: "text-amber-400 bg-amber-400/10",
                  info: "text-cyan-400 bg-cyan-400/10",
                  debug: "text-zinc-400 bg-zinc-400/10",
                };
                return (
                  <div
                    key={level}
                    className="rounded-lg border border-zinc-800 p-3 text-center"
                  >
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                        colors[level]
                      )}
                    >
                      {level}
                    </span>
                    <p className="mt-2 text-lg font-bold text-zinc-200">{count}</p>
                    <p className="text-[10px] text-zinc-500">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Task breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold">Task Status Breakdown</h2>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-xs text-zinc-500">No tasks yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(analytics.taskStatusCounts).map(([st, count]) => {
                  const colors: Record<string, string> = {
                    inbox: "bg-zinc-500",
                    up_next: "bg-blue-500",
                    in_progress: "bg-amber-500",
                    in_review: "bg-violet-500",
                    done: "bg-emerald-500",
                    planning: "bg-cyan-500",
                    assigned: "bg-orange-500",
                    testing: "bg-indigo-500",
                  };
                  return (
                    <BarSegment
                      key={st}
                      label={st.replace(/_/g, " ")}
                      value={count}
                      max={tasks.length}
                      color={colors[st] ?? "bg-zinc-500"}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent details table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold">Agent Fleet Summary</h2>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
                    <th className="px-5 py-2 text-left font-medium">Agent</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Sessions</th>
                    <th className="px-3 py-2 text-right font-medium">Messages</th>
                    <th className="px-3 py-2 text-right font-medium">Tokens</th>
                    <th className="px-3 py-2 text-right font-medium">Crons</th>
                    <th className="px-3 py-2 text-left font-medium">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr
                      key={agent.id}
                      className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/20"
                    >
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/agents/${agent.id}`}
                          className="flex items-center gap-2 hover:text-zinc-100"
                        >
                          <span className="text-sm">{agent.emoji ?? "🤖"}</span>
                          <span className="font-medium text-zinc-200">
                            {agent.name || agent.id}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          status={agent.enabled ? agent.status : "offline"}
                          pulse={agent.status === "online" || agent.status === "busy"}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-zinc-400">
                        {analytics.agentSessionMap.get(agent.id) ?? 0}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-zinc-400">
                        {analytics.agentMessageMap.get(agent.id) ?? 0}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-zinc-400">
                        {((analytics.agentTokenMap.get(agent.id) ?? 0) / 1000).toFixed(1)}K
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-zinc-400">
                        {analytics.cronByAgent.get(agent.id) ?? 0}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500">
                        {agent.lastSeen ? formatRelativeTime(agent.lastSeen) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
