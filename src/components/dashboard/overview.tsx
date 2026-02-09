"use client";

import { useGateway } from "@/hooks/use-gateway";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatRelativeTime, parseCronExpression } from "@/lib/utils";
import {
  Bot,
  Activity,
  Clock,
  ListTodo,
  Zap,
  Brain,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export function Overview() {
  const { status, agents, sessions, cronJobs, tasks, skills, stats, refresh, logs } = useGateway();
  const isConnected = status === "connected";

  if (!isConnected) {
    return (
      <EmptyState
        icon={Zap}
        title="Not Connected to Gateway"
        description="Connect to your OpenClaw Gateway to see your agent fleet, cron jobs, and tasks."
        action={
          <Link href="/settings">
            <Button variant="primary" icon={ArrowRight}>
              Configure Connection
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mission Control</h1>
          <p className="mt-1 text-sm text-zinc-500">Real-time overview of your OpenClaw fleet</p>
        </div>
        <Button icon={RefreshCw} variant="secondary" size="sm" onClick={() => refresh()}>
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Agents Online"
          value={`${stats.onlineAgents}/${stats.totalAgents}`}
          icon={Bot}
          subtitle={`${stats.totalAgents} total configured`}
          accentColor="text-emerald-400"
        />
        <StatCard
          label="Active Sessions"
          value={stats.activeSessions}
          icon={Activity}
          subtitle="Live conversation threads"
          accentColor="text-cyan-400"
        />
        <StatCard
          label="Cron Jobs"
          value={`${stats.activeCronJobs}/${stats.totalCronJobs}`}
          icon={Clock}
          subtitle={`${stats.activeCronJobs} enabled`}
          accentColor="text-amber-400"
        />
        <StatCard
          label="Pending Tasks"
          value={stats.pendingTasks}
          icon={ListTodo}
          subtitle={`${stats.totalTasks} total`}
          accentColor="text-violet-400"
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Agent Fleet */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold">Agent Fleet</h2>
            </div>
            <Link href="/agents" className="text-xs text-zinc-500 hover:text-zinc-300">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 p-0">
            {agents.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-zinc-500">No agents configured</div>
            ) : (
              agents.slice(0, 5).map((agent) => (
                <Link key={agent.id} href={`/agents/${agent.id}`}>
                  <div className="flex items-center justify-between px-5 py-2.5 transition-colors hover:bg-zinc-800/30">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{agent.emoji ?? "🤖"}</span>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{agent.name || agent.id}</p>
                        <p className="text-[10px] text-zinc-500">
                          {agent.model ?? "default"} {agent.provider ? `· ${agent.provider}` : ""}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      status={agent.enabled ? agent.status : "offline"}
                      pulse={agent.status === "online" || agent.status === "busy"}
                    />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Cron Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold">Cron Schedule</h2>
            </div>
            <Link href="/cron" className="text-xs text-zinc-500 hover:text-zinc-300">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 p-0">
            {cronJobs.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-zinc-500">No cron jobs configured</div>
            ) : (
              cronJobs.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center justify-between px-5 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {job.description || job.id}
                    </p>
                    <p className="text-[10px] font-mono text-zinc-500">
                      {parseCronExpression(job.expression)}
                      {job.agentId && ` · ${job.agentId}`}
                    </p>
                  </div>
                  <StatusBadge
                    status={job.enabled ? "online" : "offline"}
                    label={job.enabled ? "active" : "paused"}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold">Skills</h2>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {skills.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-zinc-500">
                No skills discovered yet
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {skills.map((skill) => (
                  <div key={skill.name} className="flex items-center justify-between px-5 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{skill.name}</p>
                      {skill.description && (
                        <p className="text-[10px] text-zinc-500 line-clamp-1">
                          {skill.description}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                      {skill.source}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-semibold">Recent Activity</h2>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-zinc-500">
                No recent activity
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {logs.slice(-10).reverse().map((log, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-2">
                    <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      log.level === "error" ? "bg-red-400" :
                      log.level === "warn" ? "bg-amber-400" :
                      "bg-zinc-600"
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-zinc-300">{log.message}</p>
                      <p className="text-[10px] text-zinc-600">
                        {log.source && `${log.source} · `}
                        {log.timestamp ? formatRelativeTime(log.timestamp) : "just now"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
