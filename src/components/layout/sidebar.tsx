"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useGateway } from "@/hooks/use-gateway";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  LayoutDashboard,
  Bot,
  Clock,
  ListTodo,
  Calendar,
  Settings2,
  FileCode,
  ScrollText,
  Zap,
  Wifi,
  WifiOff,
  Rss,
  ShieldCheck,
  Search,
  BarChart3,
  X,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/agents", label: "Agent Fleet", icon: Bot },
  { href: "/feed", label: "Activity Feed", icon: Rss },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck, badge: "pendingApprovals" as const },
  { href: "/cron", label: "Cron Jobs", icon: Clock },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/calendar", label: "Timeline", icon: Calendar },
  { href: "/search", label: "Search", icon: Search },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/config", label: "Config", icon: FileCode },
  { href: "/logs", label: "Live Logs", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { status, stats } = useGateway();
  const isConnected = status === "connected";

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-800 bg-zinc-950/95 backdrop-blur-xl transition-transform lg:translate-x-0 lg:z-40",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo + Close */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 ring-1 ring-emerald-500/20">
              <Zap className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-zinc-100">OpenClaw</h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Mission Control</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Connection Status */}
        <div className="border-b border-zinc-800 px-5 py-3">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-zinc-500" />
            )}
            <span className="text-xs text-zinc-400">
              {isConnected ? "Gateway Connected" : "Disconnected"}
            </span>
            <StatusBadge
              status={isConnected ? "online" : "offline"}
              pulse={isConnected}
            />
          </div>
          {isConnected && (
            <div className="mt-2 flex gap-3 text-[10px] text-zinc-500">
              <span>{stats.onlineAgents}/{stats.totalAgents} agents</span>
              <span>{stats.activeCronJobs} crons</span>
              <span>{stats.pendingTasks} tasks</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            const badgeCount = badge === "pendingApprovals" ? stats.pendingApprovals : 0;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                  isActive
                    ? "bg-zinc-800/80 text-zinc-100 shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive && "text-emerald-400")} />
                <span className="flex-1">{label}</span>
                {badgeCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-[10px] font-medium text-amber-400">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-5 py-3">
          <p className="text-[10px] text-zinc-600">
            OpenClaw Dashboard v1.0.0
          </p>
        </div>
      </aside>
    </>
  );
}
