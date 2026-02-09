"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  accentColor?: string;
}

export function StatCard({ label, value, icon: Icon, subtitle, accentColor = "text-emerald-400" }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-sm transition-all hover:border-zinc-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
          <p className={cn("mt-2 text-3xl font-bold tabular-nums", accentColor)}>{value}</p>
          {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
        </div>
        <div className={cn("rounded-lg bg-zinc-800/80 p-2.5", accentColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className={cn("absolute -bottom-1 -right-1 h-24 w-24 rounded-full opacity-5 blur-2xl", accentColor.replace("text-", "bg-"))} />
    </div>
  );
}
