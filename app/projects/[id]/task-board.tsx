"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import NewTaskForm from "./new-task-form";
import TaskCard from "./task-card";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

type TaskLabel = {
  id: string;
  name: string;
  color: string | null;
};

type TaskComment = {
  id: string;
  content: string;
  createdAt: string;
  author: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  labels: TaskLabel[];
  comments: TaskComment[];
};

type TaskBoardProps = {
  projectId: string;
  tasks: Task[];
};

type NotificationType = "success" | "error" | "info";

type Notification = {
  id: string;
  message: string;
  type: NotificationType;
};

const COLUMNS = [
  {
    status: "TODO" as const,
    label: "Todo",
    helper: "Plan upcoming work.",
  },
  {
    status: "IN_PROGRESS" as const,
    label: "In Progress",
    helper: "Focus on active items.",
  },
  {
    status: "DONE" as const,
    label: "Done",
    helper: "Celebrate the wins.",
  },
];

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const DUE_FILTERS = [
  { value: "ALL", label: "All due dates" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "NEXT_7_DAYS", label: "Due in 7 days" },
  { value: "NO_DUE_DATE", label: "No due date" },
] as const;

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isWithinNextDays(date: Date, days: number) {
  const now = startOfToday();
  const future = new Date(now);
  future.setDate(now.getDate() + days);
  return date >= now && date <= future;
}

function normalize(text: string) {
  return text.trim().toLowerCase();
}

export default function TaskBoard({ projectId, tasks }: TaskBoardProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [dueFilter, setDueFilter] = useState("ALL");
  const [labelFilter, setLabelFilter] = useState("ALL");
  const [hideDone, setHideDone] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPending, startTransition] = useTransition();

  const labelOptions = Array.from(
    new Set(
      tasks.flatMap((task) => task.labels.map((label) => label.name)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const normalizedQuery = normalize(query);
  const today = startOfToday();

  const filteredTasks = tasks.filter((task) => {
    if (hideDone && task.status === "DONE") {
      return false;
    }

    if (priorityFilter !== "ALL" && task.priority !== priorityFilter) {
      return false;
    }

    if (labelFilter !== "ALL") {
      const hasLabel = task.labels.some((label) => label.name === labelFilter);
      if (!hasLabel) {
        return false;
      }
    }

    if (dueFilter !== "ALL") {
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      if (dueFilter === "NO_DUE_DATE") {
        if (dueDate) {
          return false;
        }
      } else {
        if (!dueDate) {
          return false;
        }

        if (dueFilter === "OVERDUE" && dueDate >= today) {
          return false;
        }

        if (dueFilter === "NEXT_7_DAYS" && !isWithinNextDays(dueDate, 7)) {
          return false;
        }
      }
    }

    if (!normalizedQuery) {
      return true;
    }

    const inTitle = task.title.toLowerCase().includes(normalizedQuery);
    const inDescription = (task.description || "")
      .toLowerCase()
      .includes(normalizedQuery);
    const inLabels = task.labels.some((label) =>
      label.name.toLowerCase().includes(normalizedQuery),
    );

    return inTitle || inDescription || inLabels;
  });

  const tasksByStatus = {
    TODO: filteredTasks.filter((task) => task.status === "TODO"),
    IN_PROGRESS: filteredTasks.filter(
      (task) => task.status === "IN_PROGRESS",
    ),
    DONE: filteredTasks.filter((task) => task.status === "DONE"),
  } as const;

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((task) => task.status === "DONE").length;
  const progress = totalTasks ? (doneTasks / totalTasks) * 100 : 0;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const completedThisWeek = tasks.filter((task) => {
    if (task.status !== "DONE") {
      return false;
    }
    const updatedAt = new Date(task.updatedAt);
    return updatedAt >= weekAgo;
  }).length;

  const overdueTasks = tasks.filter((task) => {
    if (!task.dueDate || task.status === "DONE") {
      return false;
    }
    const dueDate = new Date(task.dueDate);
    return dueDate < today;
  }).length;

  const pushNotification = (
    message: string,
    type: NotificationType = "info",
  ) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    taskId: string,
  ) => {
    event.dataTransfer.setData("text/plain", taskId);
    event.dataTransfer.effectAllowed = "move";
    setDraggingId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    status: TaskStatus,
  ) => {
    event.preventDefault();
    setDragOverStatus(status);
  };

  const handleDrop = async (
    event: React.DragEvent<HTMLDivElement>,
    status: TaskStatus,
  ) => {
    event.preventDefault();
    const taskId = draggingId ?? event.dataTransfer.getData("text/plain");
    setDragOverStatus(null);
    setDraggingId(null);

    if (!taskId) {
      return;
    }

    const draggedTask = tasks.find((task) => task.id === taskId);
    if (!draggedTask || draggedTask.status === status) {
      return;
    }

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (response.ok) {
      pushNotification(
        `Moved "${draggedTask.title}" to ${COLUMNS.find(
          (column) => column.status === status,
        )?.label ?? status}.`,
        "success",
      );
      startTransition(() => {
        router.refresh();
      });
      return;
    }

    const data = await response.json().catch(() => ({}));
    pushNotification(data.error || "Unable to move task.", "error");
  };

  const handleClearFilters = () => {
    setQuery("");
    setPriorityFilter("ALL");
    setDueFilter("ALL");
    setLabelFilter("ALL");
    setHideDone(false);
  };

  return (
    <section className="flex flex-col gap-6">
      <NewTaskForm projectId={projectId} onNotify={pushNotification} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Tasks completed
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">
            {completedThisWeek}
          </p>
          <p className="text-sm text-zinc-500">This week</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Project progress
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">
            {formatPercent(progress)}
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Needs attention
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">
            {overdueTasks}
          </p>
          <p className="text-sm text-zinc-500">Overdue tasks</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            Search tasks
            <input
              className="h-11 rounded-xl border border-zinc-200 px-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400"
              placeholder="Search title, notes, labels"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            Priority
            <select
              className="h-11 rounded-xl border border-zinc-200 bg-white px-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
            >
              <option value="ALL">All priorities</option>
              <option value="LOW">{PRIORITY_LABELS.LOW}</option>
              <option value="MEDIUM">{PRIORITY_LABELS.MEDIUM}</option>
              <option value="HIGH">{PRIORITY_LABELS.HIGH}</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            Due date
            <select
              className="h-11 rounded-xl border border-zinc-200 bg-white px-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400"
              value={dueFilter}
              onChange={(event) => setDueFilter(event.target.value)}
            >
              {DUE_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            Label
            <select
              className="h-11 rounded-xl border border-zinc-200 bg-white px-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400"
              value={labelFilter}
              onChange={(event) => setLabelFilter(event.target.value)}
            >
              <option value="ALL">All labels</option>
              {labelOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm font-medium text-zinc-700">
            <input
              className="h-4 w-4 rounded border-zinc-300"
              type="checkbox"
              checked={hideDone}
              onChange={(event) => setHideDone(event.target.checked)}
            />
            Hide done tasks
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
          <span>
            Showing {filteredTasks.length} of {tasks.length} tasks
          </span>
          <button
            className="rounded-full border border-zinc-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-700"
            type="button"
            onClick={handleClearFilters}
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {COLUMNS.map((column) => {
          const columnTasks = tasksByStatus[column.status];
          const isActiveDrop = dragOverStatus === column.status;
          return (
            <div key={column.status} className="flex flex-col gap-4">
              <div
                className={`rounded-2xl border bg-white p-4 ${
                  isActiveDrop
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-zinc-200"
                }`}
              >
                <h2 className="text-base font-semibold text-zinc-900">
                  {column.label}
                </h2>
                <p className="text-sm text-zinc-500">{column.helper}</p>
              </div>
              <div
                className={`flex min-h-[120px] flex-col gap-4 rounded-2xl border border-dashed p-3 transition ${
                  isActiveDrop
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-zinc-200"
                }`}
                onDragOver={(event) => handleDragOver(event, column.status)}
                onDragLeave={() => setDragOverStatus(null)}
                onDrop={(event) => handleDrop(event, column.status)}
              >
                {columnTasks.length ? (
                  columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(event) => handleDragStart(event, task.id)}
                      onDragEnd={handleDragEnd}
                      className={
                        draggingId === task.id ? "opacity-60" : undefined
                      }
                    >
                      <TaskCard task={task} onNotify={pushNotification} />
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-6 text-sm text-zinc-500">
                    No tasks here yet. Drag a task to update its status.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {notifications.length ? (
        <div className="fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-3">
          {notifications.map((note) => (
            <div
              key={note.id}
              className={`rounded-2xl border px-4 py-3 text-sm shadow-lg ${
                note.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : note.type === "error"
                  ? "border-red-200 bg-red-50 text-red-900"
                  : "border-zinc-200 bg-white text-zinc-800"
              }`}
            >
              {note.message}
            </div>
          ))}
        </div>
      ) : null}

      {isPending ? (
        <p className="text-xs text-zinc-400">Syncing updates...</p>
      ) : null}
    </section>
  );
}
