"use client";

import { useState } from "react";
import Link from "next/link";
import { useGateway } from "@/hooks/use-gateway";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  Bot,
  Play,
  Pause,
  Zap,
  Search,
  ArrowRight,
} from "lucide-react";

export function AgentFleet() {
  const { status, agents, triggerAgent, pauseAgent, resumeAgent } = useGateway();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (status !== "connected") {
    return (
      <EmptyState
        icon={Bot}
        title="Not Connected"
        description="Connect to your gateway to manage agents."
        action={
          <Link href="/settings">
            <Button variant="primary" icon={ArrowRight}>Settings</Button>
          </Link>
        }
      />
    );
  }

  const filtered = agents.filter((a) => {
    const matchesSearch =
      !search ||
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "online" && (a.status === "online" || a.status === "busy")) ||
      (filter === "offline" && (a.status === "offline" || !a.enabled));
    return matchesSearch && matchesFilter;
  });

  const handleAction = async (action: () => Promise<void>, id: string) => {
    setLoadingAction(id);
    try {
      await action();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agent Fleet</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage, trigger, and monitor your OpenClaw agents
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-zinc-800 p-1">
          {(["all", "online", "offline"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                filter === f
                  ? "bg-zinc-800 text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Bot}
          title={search ? "No matching agents" : "No agents configured"}
          description={search ? "Try a different search term." : "Add agents in your OpenClaw configuration."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((agent) => (
            <Card key={agent.id} hover>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{agent.emoji ?? "🤖"}</span>
                    <div>
                      <Link href={`/agents/${agent.id}`}>
                        <h3 className="text-sm font-semibold text-zinc-100 hover:text-emerald-400 transition-colors">
                          {agent.name || agent.id}
                        </h3>
                      </Link>
                      <p className="text-[10px] font-mono text-zinc-500">{agent.id}</p>
                    </div>
                  </div>
                  <StatusBadge
                    status={agent.enabled ? agent.status : "offline"}
                    pulse={agent.status === "online" || agent.status === "busy"}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-zinc-500">Model</p>
                    <p className="font-mono text-zinc-300">{agent.model ?? "default"}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Provider</p>
                    <p className="font-mono text-zinc-300">{agent.provider ?? "default"}</p>
                  </div>
                  {agent.heartbeatInterval && (
                    <div>
                      <p className="text-zinc-500">Heartbeat</p>
                      <p className="font-mono text-zinc-300">{agent.heartbeatInterval}</p>
                    </div>
                  )}
                  {agent.channels && agent.channels.length > 0 && (
                    <div>
                      <p className="text-zinc-500">Channels</p>
                      <p className="font-mono text-zinc-300">{agent.channels.join(", ")}</p>
                    </div>
                  )}
                </div>

                {agent.description && (
                  <p className="mt-3 text-xs text-zinc-500 line-clamp-2">{agent.description}</p>
                )}

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2 border-t border-zinc-800 pt-3">
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Zap}
                    loading={loadingAction === `trigger-${agent.id}`}
                    onClick={() =>
                      handleAction(() => triggerAgent(agent.id), `trigger-${agent.id}`)
                    }
                  >
                    Trigger
                  </Button>
                  {agent.enabled ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Pause}
                      loading={loadingAction === `pause-${agent.id}`}
                      onClick={() =>
                        handleAction(() => pauseAgent(agent.id), `pause-${agent.id}`)
                      }
                    >
                      Pause
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Play}
                      loading={loadingAction === `resume-${agent.id}`}
                      onClick={() =>
                        handleAction(() => resumeAgent(agent.id), `resume-${agent.id}`)
                      }
                    >
                      Resume
                    </Button>
                  )}
                  <Link href={`/agents/${agent.id}`} className="ml-auto">
                    <Button size="sm" variant="ghost" icon={ArrowRight}>
                      Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
