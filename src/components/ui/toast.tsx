"use client";

import { useEffect } from "react";
import { useGateway } from "@/hooks/use-gateway";
import { cn } from "@/lib/utils";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: "border-emerald-500/30 bg-emerald-500/10",
  error: "border-red-500/30 bg-red-500/10",
  warning: "border-amber-500/30 bg-amber-500/10",
  info: "border-cyan-500/30 bg-cyan-500/10",
};

const iconColorMap = {
  success: "text-emerald-400",
  error: "text-red-400",
  warning: "text-amber-400",
  info: "text-cyan-400",
};

export function ToastContainer() {
  const { toasts, dismissToast } = useGateway();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm animate-slide-in",
              colorMap[toast.type]
            )}
          >
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconColorMap[toast.type])} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-zinc-400 truncate">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 rounded p-0.5 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
