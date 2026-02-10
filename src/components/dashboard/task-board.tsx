"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useGateway } from "@/hooks/use-gateway";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, getPriorityColor, formatRelativeTime } from "@/lib/utils";
import type { Task } from "@/types/gateway";
import {
  ListTodo,
  Plus,
  ArrowRight,
  GripVertical,
  Trash2,
} from "lucide-react";
import Link from "next/link";

const COLUMNS = [
  { key: "inbox", label: "Inbox", color: "border-zinc-600" },
  { key: "up_next", label: "Up Next", color: "border-blue-600" },
  { key: "in_progress", label: "In Progress", color: "border-amber-600" },
  { key: "in_review", label: "In Review", color: "border-violet-600" },
  { key: "done", label: "Done", color: "border-emerald-600" },
] as const;

function TaskCard({ task, agents, onDelete }: { task: Task; agents: { id: string; name: string; emoji?: string }[]; onDelete: (id: string) => void }) {
  const agent = agents.find((a) => a.id === task.agentId);

  return (
    <Card className="group">
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
          {agent ? (
            <span className="text-[10px] text-zinc-500">
              {agent.emoji ?? "🤖"} {agent.name || task.agentId}
            </span>
          ) : (
            <span className="text-[10px] text-zinc-600">Unassigned</span>
          )}
          <span className="text-[10px] text-zinc-600">
            {formatRelativeTime(task.createdAt)}
          </span>
        </div>
        <div className="mt-2 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onDelete(task.id)}
            className="rounded bg-zinc-800 p-1 text-zinc-500 transition-colors hover:bg-red-500/20 hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function SortableTaskCard({ task, agents, onDelete }: { task: Task; agents: { id: string; name: string; emoji?: string }[]; onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative", isDragging && "opacity-30")}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-3 z-10 cursor-grab rounded p-0.5 text-zinc-600 hover:text-zinc-400 active:cursor-grabbing"
      >
        <GripVertical className="h-3 w-3" />
      </div>
      <div className="pl-4">
        <TaskCard task={task} agents={agents} onDelete={onDelete} />
      </div>
    </div>
  );
}

function DroppableColumn({
  column,
  tasks,
  agents,
  onDelete,
}: {
  column: (typeof COLUMNS)[number];
  tasks: Task[];
  agents: { id: string; name: string; emoji?: string }[];
  onDelete: (id: string) => void;
}) {
  const taskIds = tasks.map((t) => t.id);

  return (
    <div className="space-y-3">
      <div className={cn("flex items-center gap-2 border-b-2 pb-2", column.color)}>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {column.label}
        </h3>
        <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="min-h-[80px] space-y-2">
          {tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-800 py-8 text-center text-xs text-zinc-600">
              Drop tasks here
            </div>
          ) : (
            tasks.map((task) => (
              <SortableTaskCard key={task.id} task={task} agents={agents} onDelete={onDelete} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function TaskBoard() {
  const { status, tasks, agents, createTask, updateTask, deleteTask } = useGateway();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as Task["priority"],
    agentId: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);

    // Check if dropped over a column
    const targetColumn = COLUMNS.find((c) => c.key === overId);
    if (targetColumn) {
      updateTask(taskId, { status: targetColumn.key });
      return;
    }

    // Check if dropped over another task — move to that task's column
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && overTask.status !== tasks.find((t) => t.id === taskId)?.status) {
      updateTask(taskId, { status: overTask.status });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Drag and drop tasks between columns. Tasks are picked up on the next heartbeat.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setShowCreateModal(true)}>
          Create Task
        </Button>
      </div>

      {/* Kanban Board with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.key);
            return (
              <DroppableColumn
                key={col.key}
                column={col}
                tasks={columnTasks}
                agents={agents}
                onDelete={deleteTask}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-60 rotate-2 opacity-90">
              <TaskCard task={activeTask} agents={agents} onDelete={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
