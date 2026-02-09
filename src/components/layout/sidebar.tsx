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
} from "lucide-react";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/agents", label: "Agent Fleet", icon: Bot },
  { href: "/cron", label: "Cron Jobs", icon: Clock },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/calendar", label: "Timeline", icon: Calendar },
  { href: "/config", label: "Config", icon: FileCode },
  { href: "/logs", label: "Live Logs", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { status, stats } = useGateway();
  const isConnected = status === "connected";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 ring-1 ring-emerald-500/20">
          <Zap className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-zinc-100">OpenClaw</h1>
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Mission Control</p>
        </div>
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
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                isActive
                  ? "bg-zinc-800/80 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive && "text-emerald-400")} />
              {label}
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
  );
}
