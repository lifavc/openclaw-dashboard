"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  loading?: boolean;
}

export function Button({
  children,
  variant = "secondary",
  size = "md",
  icon: Icon,
  loading,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50",
        {
          "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20":
            variant === "primary",
          "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700":
            variant === "secondary",
          "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50": variant === "ghost",
          "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20":
            variant === "danger",
        },
        {
          "px-2.5 py-1.5 text-xs": size === "sm",
          "px-4 py-2 text-sm": size === "md",
          "px-6 py-3 text-base": size === "lg",
        },
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : Icon ? (
        <Icon className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />
      ) : null}
      {children}
    </button>
  );
}
