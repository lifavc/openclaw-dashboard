"use client";

import { useState } from "react";
import { useGateway } from "@/hooks/use-gateway";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { parseCronExpression, formatRelativeTime } from "@/lib/utils";
import {
  Clock,
  Play,
  Pause,
  Trash2,
  Zap,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export function CronManager() {
  const { status, cronJobs, agents, runCronJob, enableCronJob, disableCronJob, removeCronJob } = useGateway();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (status !== "connected") {
    return (
      <EmptyState
        icon={Clock}
        title="Not Connected"
        description="Connect to your gateway to manage cron jobs."
        action={
          <Link href="/settings">
            <Button variant="primary" icon={ArrowRight}>Settings</Button>
          </Link>
        }
      />
    );
  }

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

  const getAgentName = (agentId?: string) => {
    if (!agentId) return "—";
    const agent = agents.find((a) => a.id === agentId);
    return agent ? `${agent.emoji ?? "🤖"} ${agent.name || agent.id}` : agentId;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cron Jobs</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage scheduled tasks and automation
        </p>
      </div>

      {cronJobs.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No Cron Jobs"
          description="Configure cron jobs in your OpenClaw configuration to automate tasks."
        />
      ) : (
        <div className="space-y-3">
          {cronJobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 rounded-lg bg-amber-400/10 p-2">
                      <Clock className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-100">
                          {job.description || job.id}
                        </h3>
                        <StatusBadge
                          status={job.enabled ? "online" : "offline"}
                          label={job.enabled ? "active" : "paused"}
                        />
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                        <span className="font-mono">{job.expression}</span>
                        <span>·</span>
                        <span>{parseCronExpression(job.expression)}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-xs sm:grid-cols-4">
                        <div>
                          <span className="text-zinc-600">Agent: </span>
                          <span className="text-zinc-300">{getAgentName(job.agentId)}</span>
                        </div>
                        <div>
                          <span className="text-zinc-600">Wake: </span>
                          <span className="text-zinc-300">{job.wakeMode}</span>
                        </div>
                        <div>
                          <span className="text-zinc-600">Delivery: </span>
                          <span className="text-zinc-300">{job.deliveryMode}</span>
                        </div>
                        {job.lastRun && (
                          <div>
                            <span className="text-zinc-600">Last run: </span>
                            <span className="text-zinc-300">{formatRelativeTime(job.lastRun)}</span>
                          </div>
                        )}
                        {job.nextRun && (
                          <div>
                            <span className="text-zinc-600">Next run: </span>
                            <span className="text-zinc-300">{formatRelativeTime(job.nextRun)}</span>
                          </div>
                        )}
                        {job.model && (
                          <div>
                            <span className="text-zinc-600">Model: </span>
                            <span className="font-mono text-zinc-300">{job.model}</span>
                          </div>
                        )}
                      </div>
                      {job.prompt && (
                        <p className="mt-2 text-xs text-zinc-500 line-clamp-2 max-w-lg">
                          {job.prompt}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="primary"
                      icon={Zap}
                      loading={loadingAction === `run-${job.id}`}
                      onClick={() => handleAction(() => runCronJob(job.id), `run-${job.id}`)}
                    >
                      Run Now
                    </Button>
                    {job.enabled ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Pause}
                        loading={loadingAction === `disable-${job.id}`}
                        onClick={() => handleAction(() => disableCronJob(job.id), `disable-${job.id}`)}
                      />
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Play}
                        loading={loadingAction === `enable-${job.id}`}
                        onClick={() => handleAction(() => enableCronJob(job.id), `enable-${job.id}`)}
                      />
                    )}
                    {confirmDelete === job.id ? (
                      <Button
                        size="sm"
                        variant="danger"
                        icon={Trash2}
                        loading={loadingAction === `remove-${job.id}`}
                        onClick={() => {
                          handleAction(() => removeCronJob(job.id), `remove-${job.id}`);
                          setConfirmDelete(null);
                        }}
                      >
                        Confirm
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        onClick={() => setConfirmDelete(job.id)}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
