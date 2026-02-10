"use client";

import { useState } from "react";
import { useGateway } from "@/hooks/use-gateway";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  Shield,
  Check,
  X,
  Terminal,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

export function ExecApprovals() {
  const { status, approvals, agents, resolveApproval } = useGateway();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");

  if (status !== "connected") {
    return (
      <EmptyState
        icon={Shield}
        title="Not Connected"
        description="Connect to your gateway to manage exec approvals."
        action={
          <Link href="/settings">
            <Button variant="primary" icon={ArrowRight}>Settings</Button>
          </Link>
        }
      />
    );
  }

  const filtered = approvals.filter((a) => {
    if (filter === "pending") return a.status === "pending";
    if (filter === "resolved") return a.status !== "pending";
    return true;
  });

  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  const handleResolve = async (id: string, decision: "approve" | "deny") => {
    setLoadingId(id);
    try {
      await resolveApproval(id, decision);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingId(null);
    }
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    return agent ? `${agent.emoji ?? "🤖"} ${agent.name || agent.id}` : agentId;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exec Approvals</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Approve or deny tool execution requests from your agents
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">
              {pendingCount} pending
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-1 rounded-lg border border-zinc-800 p-1 w-fit">
        {(["all", "pending", "resolved"] as const).map((f) => (
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
            {f === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] text-amber-400">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Shield}
          title={filter === "pending" ? "No pending approvals" : "No approvals"}
          description={filter === "pending"
            ? "All clear — no exec requests waiting for approval."
            : "Exec approval requests will appear here when agents need permission to run commands."
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((approval) => (
            <Card key={approval.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn(
                      "mt-0.5 rounded-lg p-2",
                      approval.status === "pending"
                        ? "bg-amber-400/10"
                        : approval.status === "approved"
                          ? "bg-emerald-400/10"
                          : "bg-red-400/10"
                    )}>
                      <Terminal className={cn(
                        "h-5 w-5",
                        approval.status === "pending"
                          ? "text-amber-400"
                          : approval.status === "approved"
                            ? "text-emerald-400"
                            : "text-red-400"
                      )} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-sm font-mono font-medium text-zinc-100 break-all">
                          {approval.command}
                          {approval.args && approval.args.length > 0 && (
                            <span className="text-zinc-400"> {approval.args.join(" ")}</span>
                          )}
                        </code>
                        <StatusBadge
                          status={
                            approval.status === "pending" ? "busy" :
                            approval.status === "approved" ? "online" :
                            "error"
                          }
                          label={approval.status}
                        />
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-zinc-500">
                        <span>Agent: {getAgentName(approval.agentId)}</span>
                        <span>Host: {approval.host}</span>
                        {approval.cwd && <span>Dir: {approval.cwd}</span>}
                        <span>{formatRelativeTime(approval.requestedAt)}</span>
                      </div>
                      {approval.resolvedAt && (
                        <p className="mt-1 text-[10px] text-zinc-600">
                          Resolved {formatRelativeTime(approval.resolvedAt)}
                          {approval.resolvedBy && ` by ${approval.resolvedBy}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {approval.status === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="primary"
                        icon={Check}
                        loading={loadingId === `approve-${approval.id}`}
                        onClick={() => handleResolve(approval.id, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={X}
                        loading={loadingId === `deny-${approval.id}`}
                        onClick={() => handleResolve(approval.id, "deny")}
                      >
                        Deny
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
