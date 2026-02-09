"use client";

import { useState, useRef, useEffect } from "react";
import { useGateway } from "@/hooks/use-gateway";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  ScrollText,
  ArrowRight,
  ArrowDown,
  Search,
  Filter,
  Trash2,
} from "lucide-react";
import Link from "next/link";

export function LogViewer() {
  const { status, logs } = useGateway();
  const [filter, setFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  if (status !== "connected") {
    return (
      <EmptyState
        icon={ScrollText}
        title="Not Connected"
        description="Connect to your gateway to view live logs."
        action={
          <Link href="/settings">
            <Button variant="primary" icon={ArrowRight}>Settings</Button>
          </Link>
        }
      />
    );
  }

  const filtered = logs.filter((log) => {
    const matchesText =
      !filter ||
      log.message.toLowerCase().includes(filter.toLowerCase()) ||
      log.source?.toLowerCase().includes(filter.toLowerCase());
    const matchesLevel = levelFilter === "all" || log.level === levelFilter;
    return matchesText && matchesLevel;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "text-red-400";
      case "warn":
        return "text-amber-400";
      case "info":
        return "text-cyan-400";
      case "debug":
        return "text-zinc-500";
      default:
        return "text-zinc-400";
    }
  };

  const getLevelBg = (level: string) => {
    switch (level) {
      case "error":
        return "bg-red-400/5";
      case "warn":
        return "bg-amber-400/5";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Logs</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Real-time log stream from the OpenClaw Gateway
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-zinc-800 p-1">
          {["all", "error", "warn", "info", "debug"].map((level) => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                levelFilter === level
                  ? "bg-zinc-800 text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant={autoScroll ? "primary" : "secondary"}
          icon={ArrowDown}
          onClick={() => setAutoScroll(!autoScroll)}
        >
          {autoScroll ? "Auto-scroll" : "Scroll"}
        </Button>
      </div>

      {/* Log Output */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-2">
          <span className="text-xs text-zinc-500">{filtered.length} entries</span>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[10px] text-zinc-500">Live</span>
            </div>
          </div>
        </CardHeader>
        <div
          ref={scrollRef}
          className="max-h-[600px] overflow-y-auto border-t border-zinc-800"
        >
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-500">
              {logs.length === 0 ? "Waiting for logs..." : "No matching logs"}
            </div>
          ) : (
            <div className="font-mono text-[11px] leading-relaxed">
              {filtered.map((log, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-3 px-4 py-1 hover:bg-zinc-800/30",
                    getLevelBg(log.level)
                  )}
                >
                  <span className="shrink-0 text-zinc-600 w-20">
                    {log.timestamp
                      ? new Date(log.timestamp).toLocaleTimeString()
                      : "--:--:--"}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 w-12 uppercase font-bold",
                      getLevelColor(log.level)
                    )}
                  >
                    {log.level}
                  </span>
                  {log.source && (
                    <span className="shrink-0 text-zinc-500 w-20 truncate">
                      [{log.source}]
                    </span>
                  )}
                  <span className="text-zinc-300 break-all">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
