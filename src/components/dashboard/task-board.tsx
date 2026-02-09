"use client";

import { useState } from "react";
import { useGateway } from "@/hooks/use-gateway";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, getPriorityColor, formatRelativeTime } from "@/lib/utils";
import type { Task } from "@/types/gateway";
import {
  ListTodo,
  Plus,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const COLUMNS = [
  { key: "inbox", label: "Inbox", color: "border-zinc-600" },
  { key: "up_next", label: "Up Next", color: "border-blue-600" },
  { key: "in_progress", label: "In Progress", color: "border-amber-600" },
  { key: "in_review", label: "In Review", color: "border-violet-600" },
  { key: "done", label: "Done", color: "border-emerald-600" },
] as const;

export function TaskBoard() {
  const { status, tasks, agents, createTask, updateTask } = useGateway();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as Task["priority"],
    agentId: "",
  });

  if (status !== "connected") {
    return (
      <EmptyState
        icon={ListTodo}
        title="Not Connected"
        description="Connect to your gateway to manage tasks."
        action={
          <Link href="/settings">
            <Button variant="primary" icon={ArrowRight}>Settings</Button>
          </Link>
        }
      />
    );
  }

  const handleCreate = () => {
    if (!newTask.title.trim()) return;
    createTask({
      title: newTask.title,
      description: newTask.description || undefined,
      priority: newTask.priority,
      agentId: newTask.agentId || undefined,
      status: "inbox",
    });
    setNewTask({ title: "", description: "", priority: "medium", agentId: "" });
    setShowCreateModal(false);
  };

  const moveTask = (taskId: string, newStatus: Task["status"]) => {
    updateTask(taskId, { status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Create and manage tasks for your agents. Tasks are picked up on the next heartbeat.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setShowCreateModal(true)}>
          Create Task
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="space-y-3">
              <div className={cn("flex items-center gap-2 border-b-2 pb-2", col.color)}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {col.label}
                </h3>
                <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                  {columnTasks.length}
                </span>
              </div>

              {columnTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-800 py-8 text-center text-xs text-zinc-600">
                  No tasks
                </div>
              ) : (
                columnTasks.map((task) => (
                  <Card key={task.id} className="group">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-medium text-zinc-200">{task.title}</h4>
                        {task.priority && (
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase",
                              getPriorityColor(task.priority)
                            )}
                          >
                            {task.priority}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-1 text-[10px] text-zinc-500 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        {task.agentId ? (
                          <span className="text-[10px] text-zinc-500">
                            {agents.find((a) => a.id === task.agentId)?.emoji ?? "🤖"}{" "}
                            {agents.find((a) => a.id === task.agentId)?.name ?? task.agentId}
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-600">Unassigned</span>
                        )}
                        <span className="text-[10px] text-zinc-600">
                          {formatRelativeTime(task.createdAt)}
                        </span>
                      </div>

                      {/* Move buttons */}
                      <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {COLUMNS.filter((c) => c.key !== task.status).map((c) => (
                          <button
                            key={c.key}
                            onClick={() => moveTask(task.id, c.key)}
                            className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Task"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Title</label>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
              placeholder="Task title..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Description</label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
              placeholder="Optional description..."
              rows={3}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Priority</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value as Task["priority"] }))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Assign Agent</label>
              <select
                value={newTask.agentId}
                onChange={(e) => setNewTask((p) => ({ ...p, agentId: e.target.value }))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.emoji ?? "🤖"} {a.name || a.id}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!newTask.title.trim()}>
              Create Task
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
