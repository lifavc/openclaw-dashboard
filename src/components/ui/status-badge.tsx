"use client";

import { cn, getStatusColor, getStatusBgColor } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  label?: string;
  pulse?: boolean;
  size?: "sm" | "md";
}

export function StatusBadge({ status, label, pulse, size = "sm" }: StatusBadgeProps) {
  const dotColor = getStatusColor(status).replace("text-", "bg-");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono uppercase tracking-wider",
        getStatusBgColor(status),
        size === "sm" ? "text-[10px]" : "text-xs"
      )}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              dotColor
            )}
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", dotColor)} />
      </span>
      {label ?? status}
    </span>
  );
}
