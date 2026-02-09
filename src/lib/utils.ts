import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function parseCronExpression(expr: string): string {
  const parts = expr.split(" ");
  if (parts.length !== 5) return expr;

  const [min, hour, dom, mon, dow] = parts;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (dom === "*" && mon === "*" && dow === "*") {
    if (min === "0" && hour === "*") return "Every hour";
    if (min === "*/5") return "Every 5 minutes";
    if (min === "*/15") return "Every 15 minutes";
    if (min === "*/30") return "Every 30 minutes";
    if (hour !== "*") return `Daily at ${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
    return `At :${min.padStart(2, "0")} every hour`;
  }

  if (dow !== "*" && dom === "*" && mon === "*") {
    const dayNames = dow.split(",").map((d) => days[parseInt(d)] ?? d).join(", ");
    return `${dayNames} at ${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
  }

  if (dom !== "*" && mon !== "*") {
    return `${months[parseInt(mon)] ?? mon} ${dom} at ${hour}:${min}`;
  }

  return expr;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "online":
    case "active":
    case "done":
    case "completed":
      return "text-emerald-400";
    case "busy":
    case "in_progress":
    case "assigned":
      return "text-amber-400";
    case "offline":
    case "idle":
    case "inbox":
    case "planning":
      return "text-zinc-400";
    case "error":
    case "critical":
      return "text-red-400";
    case "in_review":
    case "testing":
      return "text-blue-400";
    default:
      return "text-zinc-400";
  }
}

export function getStatusBgColor(status: string): string {
  switch (status) {
    case "online":
    case "active":
    case "done":
      return "bg-emerald-400/10 border-emerald-400/20";
    case "busy":
    case "in_progress":
    case "assigned":
      return "bg-amber-400/10 border-amber-400/20";
    case "offline":
    case "idle":
    case "inbox":
      return "bg-zinc-400/10 border-zinc-400/20";
    case "error":
    case "critical":
      return "bg-red-400/10 border-red-400/20";
    default:
      return "bg-zinc-400/10 border-zinc-400/20";
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "critical":
      return "text-red-400 bg-red-400/10";
    case "high":
      return "text-orange-400 bg-orange-400/10";
    case "medium":
      return "text-amber-400 bg-amber-400/10";
    case "low":
      return "text-zinc-400 bg-zinc-400/10";
    default:
      return "text-zinc-400 bg-zinc-400/10";
  }
}
