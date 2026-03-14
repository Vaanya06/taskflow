"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import NewTaskForm from "./new-task-form";
import TaskCard from "./task-card";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
type ViewMode = "ALL" | "FOCUS" | "DUE_SOON" | "RECENTLY_UPDATED";
type SortMode = "UPDATED" | "DUE_ASC" | "PRIORITY" | "TITLE";

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

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

const DUE_FILTERS = [
  { value: "ALL", label: "All due dates" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "NEXT_7_DAYS", label: "Due in 7 days" },
  { value: "NO_DUE_DATE", label: "No due date" },
] as const;

const VIEW_PRESETS = [
  { value: "ALL" as const, label: "All work" },
  { value: "FOCUS" as const, label: "Focus" },
  { value: "DUE_SOON" as const, label: "Due soon" },
  { value: "RECENTLY_UPDATED" as const, label: "Recently updated" },
];

const SORT_OPTIONS = [
  { value: "UPDATED" as const, label: "Recently updated" },
  { value: "DUE_ASC" as const, label: "Due date" },
  { value: "PRIORITY" as const, label: "Priority" },
  { value: "TITLE" as const, label: "Title" },
];

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isWithinNextDays(date: Date, days: number) {
  const now = startOfToday();
  const future = new Date(now);
  future.setDate(now.getDate() + days);
  const normalized = startOfDate(date);
  return normalized >= now && normalized <= future;
}

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function getDueDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function matchesViewPreset(
  task: Task,
  viewMode: ViewMode,
  today: Date,
  recentThreshold: Date,
) {
  const dueDate = getDueDate(task.dueDate);

  switch (viewMode) {
    case "FOCUS":
      return (
        task.status !== "DONE" &&
        (task.priority === "HIGH" ||
          (dueDate !== null && startOfDate(dueDate) < today))
      );
    case "DUE_SOON":
      return (
        task.status !== "DONE" &&
        dueDate !== null &&
        isWithinNextDays(dueDate, 7)
      );
    case "RECENTLY_UPDATED":
      return new Date(task.updatedAt) >= recentThreshold;
    case "ALL":
    default:
      return true;
  }
}

function compareDueDates(left: string | null, right: string | null) {
  const leftDate = getDueDate(left);
  const rightDate = getDueDate(right);

  if (leftDate && rightDate) {
    return startOfDate(leftDate).getTime() - startOfDate(rightDate).getTime();
  }

  if (leftDate) {
    return -1;
  }

  if (rightDate) {
    return 1;
  }

  return 0;
}

export default function TaskBoard({ projectId, tasks }: TaskBoardProps) {
  const router = useRouter();
  const notificationIdRef = useRef(0);
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [dueFilter, setDueFilter] = useState("ALL");
  const [labelFilter, setLabelFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("UPDATED");
  const [hideDone, setHideDone] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPending, startTransition] = useTransition();

  const labelOptions = Array.from(
    new Set(tasks.flatMap((task) => task.labels.map((label) => label.name))),
  ).sort((a, b) => a.localeCompare(b));

  const normalizedQuery = normalize(query);
  const today = startOfToday();
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(today.getDate() - 3);

  const filteredTasks = tasks.filter((task) => {
    if (!matchesViewPreset(task, viewMode, today, threeDaysAgo)) {
      return false;
    }

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
      const dueDate = getDueDate(task.dueDate);
      if (dueFilter === "NO_DUE_DATE") {
        if (dueDate) {
          return false;
        }
      } else {
        if (!dueDate) {
          return false;
        }

        if (dueFilter === "OVERDUE" && startOfDate(dueDate) >= today) {
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

  const sortedTasks = [...filteredTasks].sort((left, right) => {
    if (sortMode === "TITLE") {
      return left.title.localeCompare(right.title);
    }

    if (sortMode === "DUE_ASC") {
      const dueDifference = compareDueDates(left.dueDate, right.dueDate);
      if (dueDifference !== 0) {
        return dueDifference;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    }

    if (sortMode === "PRIORITY") {
      const priorityDifference = PRIORITY_WEIGHT[left.priority] - PRIORITY_WEIGHT[right.priority];
      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      const dueDifference = compareDueDates(left.dueDate, right.dueDate);
      if (dueDifference !== 0) {
        return dueDifference;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });

  const tasksByStatus = {
    TODO: sortedTasks.filter((task) => task.status === "TODO"),
    IN_PROGRESS: sortedTasks.filter((task) => task.status === "IN_PROGRESS"),
    DONE: sortedTasks.filter((task) => task.status === "DONE"),
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
    const dueDate = getDueDate(task.dueDate);
    if (!dueDate || task.status === "DONE") {
      return false;
    }
    return startOfDate(dueDate) < today;
  }).length;

  const highPriorityTasks = tasks.filter(
    (task) => task.status !== "DONE" && task.priority === "HIGH",
  ).length;

  const viewCounts = {
    ALL: tasks.length,
    FOCUS: tasks.filter((task) => matchesViewPreset(task, "FOCUS", today, threeDaysAgo)).length,
    DUE_SOON: tasks.filter((task) => matchesViewPreset(task, "DUE_SOON", today, threeDaysAgo)).length,
    RECENTLY_UPDATED: tasks.filter((task) =>
      matchesViewPreset(task, "RECENTLY_UPDATED", today, threeDaysAgo),
    ).length,
  };

  const pushNotification = (
    message: string,
    type: NotificationType = "info",
  ) => {
    notificationIdRef.current += 1;
    const id = "notification-" + notificationIdRef.current;
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
        `Moved ${draggedTask.title} to ${COLUMNS.find((column) => column.status === status)?.label ?? status}.`,
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
    setViewMode("ALL");
    setSortMode("UPDATED");
    setHideDone(false);
  };

  return (
    <section className="flex flex-col gap-5">
      <NewTaskForm projectId={projectId} onNotify={pushNotification} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
            Tasks completed
          </p>
          <p className="mt-2 text-3xl font-semibold text-white/90">
            {completedThisWeek}
          </p>
          <p className="text-sm text-white/35">This week</p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
            Project progress
          </p>
          <p className="mt-2 text-3xl font-semibold text-white/90">
            {formatPercent(progress)}
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
            Needs attention
          </p>
          <p className="mt-2 text-3xl font-semibold text-white/90">
            {overdueTasks}
          </p>
          <p className="text-sm text-white/35">Overdue tasks</p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
            High priority
          </p>
          <p className="mt-2 text-3xl font-semibold text-white/90">
            {highPriorityTasks}
          </p>
          <p className="text-sm text-white/35">Open tasks marked high</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
              Quick views
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {VIEW_PRESETS.map((view) => {
                const isActive = viewMode === view.value;
                return (
                  <button
                    key={view.value}
                    type="button"
                    onClick={() => setViewMode(view.value)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition ${
                      isActive
                        ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-200"
                        : "border-white/10 bg-white/5 text-white/45 hover:border-white/20 hover:text-white/75"
                    }`}
                  >
                    {view.label}
                    <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px]">
                      {viewCounts[view.value]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex w-full max-w-xs flex-col gap-2 text-sm font-medium text-white/55">
            Sort by
            <select
              className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
            Search tasks
            <input
              className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
              placeholder="Search title, notes, labels"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
            Priority
            <select
              className="h-11 rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
            >
              <option value="ALL">All priorities</option>
              <option value="LOW">{PRIORITY_LABELS.LOW}</option>
              <option value="MEDIUM">{PRIORITY_LABELS.MEDIUM}</option>
              <option value="HIGH">{PRIORITY_LABELS.HIGH}</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
            Due date
            <select
              className="h-11 rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
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
          <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
            Label
            <select
              className="h-11 rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
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
          <label className="flex items-center gap-3 pt-8 text-sm font-medium text-white/55">
            <input
              className="h-4 w-4 rounded border-white/20 bg-white/5"
              type="checkbox"
              checked={hideDone}
              onChange={(event) => setHideDone(event.target.checked)}
            />
            Hide done tasks
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/30">
          <span>
            Showing {filteredTasks.length} of {tasks.length} tasks · {SORT_OPTIONS.find((option) => option.value === sortMode)?.label}
          </span>
          <button
            className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45 transition hover:border-white/20 hover:text-white/70"
            type="button"
            onClick={handleClearFilters}
          >
            Clear filters
          </button>
        </div>
      </div>

      <div id="board" className="grid gap-6 lg:grid-cols-3">
        {COLUMNS.map((column) => {
          const columnTasks = tasksByStatus[column.status];
          const isActiveDrop = dragOverStatus === column.status;
          return (
            <div key={column.status} className="flex flex-col gap-4">
              <div
                className={`rounded-xl border bg-[#1a1d27] p-4 ${
                  isActiveDrop
                    ? "border-indigo-500/40"
                    : "border-white/[0.07]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-white/85">
                      {column.label}
                    </h2>
                    <p className="text-sm text-white/35">{column.helper}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/35">
                    {columnTasks.length}
                  </span>
                </div>
              </div>
              <div
                className={`flex min-h-[120px] flex-col gap-4 rounded-xl border border-dashed bg-[#13161f] p-3 transition ${
                  isActiveDrop
                    ? "border-indigo-500/40 bg-indigo-500/[0.06]"
                    : "border-white/[0.08]"
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
                      className={draggingId === task.id ? "opacity-60" : undefined}
                    >
                      <TaskCard task={task} onNotify={pushNotification} />
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-white/[0.08] bg-[#1a1d27] p-6 text-sm text-white/25">
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
              className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${
                note.type === "success"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : note.type === "error"
                    ? "border-red-500/20 bg-red-500/10 text-red-300"
                    : "border-white/[0.08] bg-[#1a1d27] text-white/80"
              }`}
            >
              {note.message}
            </div>
          ))}
        </div>
      ) : null}

      <div id="activity">
        {isPending ? (
          <p className="text-xs text-white/25">Syncing updates...</p>
        ) : null}
      </div>
    </section>
  );
}
