"use client";

import { useState, useMemo } from "react";
import { useGateway } from "@/hooks/use-gateway";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { cn, getStatusColor, parseCronExpression } from "@/lib/utils";
import { Calendar, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export function CalendarTimeline() {
  const { status, cronJobs, agents, tasks, sessions } = useGateway();
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [currentDate, setCurrentDate] = useState(new Date());

  if (status !== "connected") {
    return (
      <EmptyState
        icon={Calendar}
        title="Not Connected"
        description="Connect to your gateway to view the timeline."
        action={
          <Link href="/settings">
            <Button variant="primary" icon={ArrowRight}>Settings</Button>
          </Link>
        }
      />
    );
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  const filteredCronJobs = cronJobs.filter(
    (job) => selectedAgent === "all" || job.agentId === selectedAgent
  );
  const filteredTasks = tasks.filter(
    (task) => selectedAgent === "all" || task.agentId === selectedAgent
  );

  // Group events by day
  const dayEvents = useMemo(() => {
    const events: Record<number, Array<{ type: string; label: string; color: string }>> = {};

    filteredCronJobs.forEach((job) => {
      if (!job.enabled) return;
      const parts = job.expression.split(" ");
      if (parts.length !== 5) return;

      const [, , dom, mon] = parts;

      // For daily/hourly crons, mark every day
      if (dom === "*") {
        for (let d = 1; d <= daysInMonth; d++) {
          if (!events[d]) events[d] = [];
          events[d].push({
            type: "cron",
            label: job.description || parseCronExpression(job.expression),
            color: "bg-amber-400",
          });
        }
      } else {
        // Specific day of month
        const day = parseInt(dom);
        if (day >= 1 && day <= daysInMonth) {
          if (!events[day]) events[day] = [];
          events[day].push({
            type: "cron",
            label: job.description || parseCronExpression(job.expression),
            color: "bg-amber-400",
          });
        }
      }
    });

    filteredTasks.forEach((task) => {
      if (task.dueDate) {
        const due = new Date(task.dueDate);
        if (due.getMonth() === month && due.getFullYear() === year) {
          const day = due.getDate();
          if (!events[day]) events[day] = [];
          events[day].push({
            type: "task",
            label: task.title,
            color: task.status === "done" ? "bg-emerald-400" : "bg-violet-400",
          });
        }
      }
    });

    return events;
  }, [filteredCronJobs, filteredTasks, month, year, daysInMonth]);

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Calendar view of cron schedules and task deadlines, filterable by agent
        </p>
      </div>

      {/* Agent Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedAgent("all")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            selectedAgent === "all"
              ? "bg-zinc-700 text-zinc-100"
              : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"
          )}
        >
          All Agents
        </button>
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setSelectedAgent(agent.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              selectedAgent === agent.id
                ? "bg-zinc-700 text-zinc-100"
                : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"
            )}
          >
            {agent.emoji ?? "🤖"} {agent.name || agent.id}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-semibold">{monthName}</h2>
            <button onClick={nextMonth} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-1 text-center text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before the 1st */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 rounded-lg bg-zinc-900/30" />
            ))}

            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const events = dayEvents[day] ?? [];
              return (
                <div
                  key={day}
                  className={cn(
                    "h-24 rounded-lg border p-1.5 transition-colors",
                    isToday(day)
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700"
                  )}
                >
                  <div className={cn(
                    "text-xs font-medium",
                    isToday(day) ? "text-emerald-400" : "text-zinc-500"
                  )}>
                    {day}
                  </div>
                  <div className="mt-1 space-y-0.5 overflow-hidden">
                    {events.slice(0, 3).map((evt, j) => (
                      <div
                        key={j}
                        className="flex items-center gap-1"
                        title={evt.label}
                      >
                        <div className={cn("h-1 w-1 shrink-0 rounded-full", evt.color)} />
                        <span className="truncate text-[9px] text-zinc-400">{evt.label}</span>
                      </div>
                    ))}
                    {events.length > 3 && (
                      <span className="text-[9px] text-zinc-600">+{events.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 border-t border-zinc-800 pt-3">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-[10px] text-zinc-500">Cron Jobs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-violet-400" />
              <span className="text-[10px] text-zinc-500">Pending Tasks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-zinc-500">Completed Tasks</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Active Cron Jobs</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">{filteredCronJobs.filter((c) => c.enabled).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Pending Tasks</p>
            <p className="mt-1 text-2xl font-bold text-violet-400">{filteredTasks.filter((t) => t.status !== "done").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Completed</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{filteredTasks.filter((t) => t.status === "done").length}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
