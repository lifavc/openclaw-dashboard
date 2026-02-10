"use client";

import { useState } from "react";
import { useGateway } from "@/hooks/use-gateway";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  Activity,
  Bot,
  Clock,
  Shield,
  MessageSquare,
  Terminal,
  AlertCircle,
  Zap,
  ArrowRight,
  Filter,
} from "lucide-react";
import Link from "next/link";

const EVENT_ICONS = {
  agent: Bot,
  cron: Clock,
  task: Zap,
  approval: Shield,
  chat: MessageSquare,
  system: Activity,
  tool: Terminal,
  error: AlertCircle,
} as const;

const EVENT_COLORS = {
  agent: "text-emerald-400 bg-emerald-400/10",
  cron: "text-amber-400 bg-amber-400/10",
  task: "text-violet-400 bg-violet-400/10",
  approval: "text-orange-400 bg-orange-400/10",
  chat: "text-cyan-400 bg-cyan-400/10",
  system: "text-zinc-400 bg-zinc-400/10",
  tool: "text-blue-400 bg-blue-400/10",
  error: "text-red-400 bg-red-400/10",
} as const;

type EventFilter = "all" | "agent" | "cron" | "approval" | "chat" | "system" | "tool" | "error";

export function ActivityFeed() {
  const { status, activityFeed, agents, logs } = useGateway();
  const [filter, setFilter] = useState<EventFilter>("all");

  if (status !== "connected") {
    return (
      <EmptyState
        icon={Activity}
        title="Not Connected"
        description="Connect to your gateway to see activity."
        action={
          <Link href="/settings">
            <Button variant="primary" icon={ArrowRight}>Settings</Button>
          </Link>
        }
      />
    );
  }

  // Merge activity feed with recent logs to form a combined timeline
  const combinedFeed = [
    ...activityFeed,
    ...logs.slice(-50).map((log, i) => ({
      id: `log-${i}-${log.timestamp}`,
      type: log.level === "error" ? "error" as const : "system" as const,
      title: log.message,
      description: log.source ? `[${log.source}]` : undefined,
      agentId: log.agentId,
      timestamp: log.timestamp,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 200);

  const filtered = filter === "all"
    ? combinedFeed
    : combinedFeed.filter((e) => e.type === filter);

  const filters: { key: EventFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "agent", label: "Agents" },
    { key: "cron", label: "Cron" },
    { key: "approval", label: "Approvals" },
    { key: "chat", label: "Chat" },
    { key: "tool", label: "Tools" },
    { key: "system", label: "System" },
    { key: "error", label: "Errors" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity Feed</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Real-time timeline of all agent events, cron runs, and system activity
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-zinc-500" />
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
              filter === f.key
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-2">
          <span className="text-xs text-zinc-500">{filtered.length} events</span>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-[10px] text-zinc-500">Live</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-500">
              {activityFeed.length === 0 ? "Waiting for events..." : "No matching events"}
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto divide-y divide-zinc-800/50">
              {filtered.map((event) => {
                const Icon = EVENT_ICONS[event.type] ?? Activity;
                const color = EVENT_COLORS[event.type] ?? EVENT_COLORS.system;
                const agent = event.agentId ? agents.find((a) => a.id === event.agentId) : null;

                return (
                  <div key={event.id} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-zinc-800/20">
                    <div className={cn("mt-0.5 rounded-lg p-1.5", color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200">{event.title}</p>
                      {event.description && (
                        <p className="mt-0.5 text-xs text-zinc-500 truncate">{event.description}</p>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-600">
                        {agent && (
                          <span>{agent.emoji ?? "🤖"} {agent.name || agent.id}</span>
                        )}
                        {event.agentId && !agent && (
                          <span>{event.agentId}</span>
                        )}
                        <span>{formatRelativeTime(event.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
