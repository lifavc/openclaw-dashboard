"use client";

import { useGateway } from "@/hooks/use-gateway";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, Activity, Clock, Cpu, Menu } from "lucide-react";

function formatUptime(seconds?: number): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "—";
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(0)}MB`;
}

export function HealthBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { status, health, stats } = useGateway();
  const isConnected = status === "connected";

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-zinc-800 bg-zinc-950/90 px-4 py-2 backdrop-blur-sm lg:px-6">
      {/* Mobile menu button */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Gateway status */}
      <div className="flex items-center gap-2">
        <div className="relative">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-emerald-400" />
          ) : (
            <WifiOff className="h-4 w-4 text-zinc-500" />
          )}
          {isConnected && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </div>
        <span className="text-xs font-medium text-zinc-400">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {isConnected && (
        <>
          <div className="h-4 w-px bg-zinc-800" />

          {/* Version */}
          {health?.version && (
            <span className="text-[10px] font-mono text-zinc-500">
              v{health.version}
            </span>
          )}

          {/* Stats */}
          <div className="hidden items-center gap-4 text-[10px] text-zinc-500 sm:flex">
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span>{stats.onlineAgents}/{stats.totalAgents} agents</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Up {formatUptime(health?.uptime)}</span>
            </div>
            {health?.memory && (
              <div className="flex items-center gap-1">
                <Cpu className="h-3 w-3" />
                <span>{formatBytes(health.memory.heapUsed)} / {formatBytes(health.memory.heapTotal)}</span>
              </div>
            )}
          </div>

          {/* Approval badge */}
          {stats.pendingApprovals > 0 && (
            <>
              <div className="h-4 w-px bg-zinc-800" />
              <a
                href="/approvals"
                className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                {stats.pendingApprovals} pending approval{stats.pendingApprovals > 1 ? "s" : ""}
              </a>
            </>
          )}
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <span className="text-[10px] text-zinc-600 hidden sm:block">OpenClaw Mission Control</span>
    </header>
  );
}
