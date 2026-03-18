"use client";

import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import NewTaskForm from "./new-task-form";
import TaskCard from "./task-card";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
type IssueType = "EPIC" | "STORY" | "TASK" | "BUG";
type ViewMode = "ALL" | "MINE" | "FOCUS" | "BACKLOG" | "CURRENT_SPRINT" | "RECENTLY_UPDATED";
type SortMode = "UPDATED" | "DUE_ASC" | "PRIORITY" | "POINTS" | "TITLE";
type LayoutMode = "BOARD" | "LIST";

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

type TaskAssignee = {
  id: string;
  name: string | null;
  email: string;
} | null;

type SprintOption = {
  id: string;
  title: string;
  isActive: boolean;
};

type ProjectMember = {
  id: string;
  name: string | null;
  email: string;
  role: "OWNER" | "MEMBER";
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  issueType: IssueType;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoints: number | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: TaskAssignee;
  sprint: SprintOption | null;
  labels: TaskLabel[];
  comments: TaskComment[];
};

type TaskBoardProps = {
  projectId: string;
  tasks: Task[];
  members: ProjectMember[];
  sprints: SprintOption[];
  currentUserId: string;
  canDeleteTasks: boolean;
};

type NotificationType = "success" | "error" | "info";

type Notification = {
  id: string;
  message: string;
  type: NotificationType;
};

const COLUMNS = [
  { status: "TODO" as const, label: "Todo", helper: "Plan upcoming work." },
  { status: "IN_PROGRESS" as const, label: "In progress", helper: "Focus on active items." },
  { status: "DONE" as const, label: "Done", helper: "Celebrate the wins." },
];

const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  EPIC: "Epic",
  STORY: "Story",
  TASK: "Task",
  BUG: "Bug",
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
  { value: "MINE" as const, label: "Assigned to me" },
  { value: "BACKLOG" as const, label: "Backlog" },
  { value: "CURRENT_SPRINT" as const, label: "Current sprint" },
  { value: "FOCUS" as const, label: "Focus" },
  { value: "RECENTLY_UPDATED" as const, label: "Recently updated" },
];

const SORT_OPTIONS = [
  { value: "UPDATED" as const, label: "Recently updated" },
  { value: "DUE_ASC" as const, label: "Due date" },
  { value: "PRIORITY" as const, label: "Priority" },
  { value: "POINTS" as const, label: "Story points" },
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
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getPersonLabel(person: { name: string | null; email: string }) {
  return person.name || person.email;
}

function formatDueLabel(value: string | null) {
  const date = getDueDate(value);
  if (!date) {
    return "No due date";
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function matchesViewPreset(task: Task, viewMode: ViewMode, today: Date, recentThreshold: Date, currentUserId: string, activeSprintId: string | null) {
  const dueDate = getDueDate(task.dueDate);

  switch (viewMode) {
    case "MINE":
      return task.assignee?.id === currentUserId;
    case "BACKLOG":
      return !task.sprint;
    case "CURRENT_SPRINT":
      return activeSprintId ? task.sprint?.id === activeSprintId : false;
    case "FOCUS":
      return task.status !== "DONE" && (task.priority === "HIGH" || (dueDate !== null && startOfDate(dueDate) < today));
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

export default function TaskBoard({
  projectId,
  tasks,
  members,
  sprints,
  currentUserId,
  canDeleteTasks,
}: TaskBoardProps) {
  const router = useRouter();
  const notificationIdRef = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [issueTypeFilter, setIssueTypeFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [dueFilter, setDueFilter] = useState("ALL");
  const [labelFilter, setLabelFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [sprintFilter, setSprintFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("UPDATED");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("BOARD");
  const [hideDone, setHideDone] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(tasks[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();

  const deferredQuery = useDeferredValue(query);
  const projectLabels = Array.from(new Map(tasks.flatMap((task) => task.labels.map((label) => [label.id, label]))).values()).sort((left, right) => left.name.localeCompare(right.name));
  const labelOptions = projectLabels.map((label) => label.name);
  const activeSprintId = sprints.find((sprint) => sprint.isActive)?.id ?? null;
  const activeSprint = activeSprintId ? sprints.find((sprint) => sprint.id === activeSprintId) ?? null : null;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = Boolean(target?.closest("input, textarea, select, [contenteditable='true']"));

      if (!isTyping && event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const normalizedQuery = normalize(deferredQuery);
  const today = startOfToday();
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(today.getDate() - 3);

  const filteredTasks = tasks.filter((task) => {
    if (!matchesViewPreset(task, viewMode, today, threeDaysAgo, currentUserId, activeSprintId)) {
      return false;
    }

    if (hideDone && task.status === "DONE") {
      return false;
    }

    if (issueTypeFilter !== "ALL" && task.issueType !== issueTypeFilter) {
      return false;
    }

    if (priorityFilter !== "ALL" && task.priority !== priorityFilter) {
      return false;
    }

    if (labelFilter !== "ALL" && !task.labels.some((label) => label.name === labelFilter)) {
      return false;
    }

    if (assigneeFilter === "UNASSIGNED" && task.assignee) {
      return false;
    }

    if (assigneeFilter !== "ALL" && assigneeFilter !== "UNASSIGNED" && task.assignee?.id !== assigneeFilter) {
      return false;
    }

    if (sprintFilter === "BACKLOG" && task.sprint) {
      return false;
    }

    if (sprintFilter !== "ALL" && sprintFilter !== "BACKLOG" && task.sprint?.id !== sprintFilter) {
      return false;
    }

    if (dueFilter !== "ALL") {
      const dueDate = getDueDate(task.dueDate);
      if (dueFilter === "NO_DUE_DATE") {
        return !dueDate;
      }

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

    if (!normalizedQuery) {
      return true;
    }

    const inTitle = task.title.toLowerCase().includes(normalizedQuery);
    const inDescription = (task.description || "").toLowerCase().includes(normalizedQuery);
    const inLabels = task.labels.some((label) => label.name.toLowerCase().includes(normalizedQuery));
    const inAssignee = task.assignee ? getPersonLabel(task.assignee).toLowerCase().includes(normalizedQuery) || task.assignee.email.toLowerCase().includes(normalizedQuery) : false;
    const inSprint = task.sprint ? task.sprint.title.toLowerCase().includes(normalizedQuery) : "backlog".includes(normalizedQuery);

    return inTitle || inDescription || inLabels || inAssignee || inSprint;
  });

  const sortedTasks = [...filteredTasks].sort((left, right) => {
    if (sortMode === "TITLE") {
      return left.title.localeCompare(right.title);
    }

    if (sortMode === "DUE_ASC") {
      const dueDifference = compareDueDates(left.dueDate, right.dueDate);
      return dueDifference !== 0 ? dueDifference : new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    }

    if (sortMode === "PRIORITY") {
      const priorityDifference = PRIORITY_WEIGHT[left.priority] - PRIORITY_WEIGHT[right.priority];
      if (priorityDifference !== 0) {
        return priorityDifference;
      }
      const dueDifference = compareDueDates(left.dueDate, right.dueDate);
      return dueDifference !== 0 ? dueDifference : new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    }

    if (sortMode === "POINTS") {
      const pointsDifference = (right.storyPoints ?? 0) - (left.storyPoints ?? 0);
      return pointsDifference !== 0 ? pointsDifference : new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
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
  const completedThisWeek = tasks.filter((task) => task.status === "DONE" && new Date(task.updatedAt) >= weekAgo).length;
  const backlogTasks = tasks.filter((task) => !task.sprint).length;
  const currentSprintPoints = activeSprintId ? tasks.filter((task) => task.sprint?.id === activeSprintId).reduce((sum, task) => sum + (task.storyPoints ?? 0), 0) : 0;
  const overdueCount = tasks.filter((task) => task.status !== "DONE" && task.dueDate && startOfDate(new Date(task.dueDate)) < today).length;
  const dueSoonCount = tasks.filter((task) => task.status !== "DONE" && task.dueDate && isWithinNextDays(new Date(task.dueDate), 7)).length;
  const mineCount = tasks.filter((task) => task.assignee?.id === currentUserId && task.status !== "DONE").length;
  const focusSpotlight = sortedTasks.find((task) => matchesViewPreset(task, "FOCUS", today, threeDaysAgo, currentUserId, activeSprintId)) ?? sortedTasks[0] ?? null;
  const selectedTask = sortedTasks.find((task) => task.id === selectedTaskId) ?? sortedTasks[0] ?? null;

  const viewCounts = {
    ALL: tasks.length,
    MINE: tasks.filter((task) => task.assignee?.id === currentUserId).length,
    BACKLOG: tasks.filter((task) => !task.sprint).length,
    CURRENT_SPRINT: activeSprintId ? tasks.filter((task) => task.sprint?.id === activeSprintId).length : 0,
    FOCUS: tasks.filter((task) => matchesViewPreset(task, "FOCUS", today, threeDaysAgo, currentUserId, activeSprintId)).length,
    RECENTLY_UPDATED: tasks.filter((task) => matchesViewPreset(task, "RECENTLY_UPDATED", today, threeDaysAgo, currentUserId, activeSprintId)).length,
  };

  const pushNotification = (message: string, type: NotificationType = "info") => {
    notificationIdRef.current += 1;
    const id = `notification-${notificationIdRef.current}`;
    setNotifications((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, taskId: string) => {
    event.dataTransfer.setData("text/plain", taskId);
    event.dataTransfer.effectAllowed = "move";
    setDraggingId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    event.preventDefault();
    setDragOverStatus(status);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (response.ok) {
      pushNotification(`Moved ${draggedTask.title} to ${COLUMNS.find((column) => column.status === status)?.label ?? status}.`, "success");
      startTransition(() => router.refresh());
      return;
    }

    const data = await response.json().catch(() => ({}));
    pushNotification(data.error || "Unable to move issue.", "error");
  };

  const handleClearFilters = () => {
    setQuery("");
    setIssueTypeFilter("ALL");
    setPriorityFilter("ALL");
    setDueFilter("ALL");
    setLabelFilter("ALL");
    setAssigneeFilter("ALL");
    setSprintFilter("ALL");
    setViewMode("ALL");
    setSortMode("UPDATED");
    setHideDone(false);
  };

  return (
    <section className="flex flex-col gap-6">
      <NewTaskForm projectId={projectId} members={members} sprints={sprints} onNotify={pushNotification} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel-card-soft rounded-[28px] p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/28">Issues completed</p><p className="mt-3 text-3xl font-semibold text-white/92">{completedThisWeek}</p><p className="mt-2 text-sm text-white/38">This week</p></div>
        <div className="panel-card-soft rounded-[28px] p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/28">Project progress</p><p className="mt-3 text-3xl font-semibold text-white/92">{formatPercent(progress)}</p><div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[linear-gradient(135deg,rgba(62,214,177,1),rgba(127,211,247,0.82))]" style={{ width: `${Math.min(progress, 100)}%` }} /></div></div>
        <div className="panel-card-soft rounded-[28px] p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/28">Backlog items</p><p className="mt-3 text-3xl font-semibold text-white/92">{backlogTasks}</p><p className="mt-2 text-sm text-white/38">Issues not assigned to a sprint</p></div>
        <div className="panel-card-soft rounded-[28px] p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/28">Active sprint points</p><p className="mt-3 text-3xl font-semibold text-white/92">{currentSprintPoints}</p><p className="mt-2 text-sm text-white/38">{activeSprint ? activeSprint.title : "No active sprint"}</p></div>
      </div>

      <div className="panel-card rounded-[32px] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">Board control</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {VIEW_PRESETS.map((view) => (
                <button key={view.value} type="button" onClick={() => setViewMode(view.value)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${viewMode === view.value ? "border-[var(--accent)]/25 bg-[rgba(62,214,177,0.12)] text-[var(--accent)]" : "border-white/10 bg-white/5 text-white/48 hover:text-white/78"}`}>
                  {view.label} <span className="ml-2 text-[10px] opacity-80">{viewCounts[view.value]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setLayoutMode("BOARD")} className={`secondary-button flex h-10 items-center px-4 text-xs font-semibold uppercase tracking-[0.16em] ${layoutMode === "BOARD" ? "text-white" : "text-white/58"}`}>Board lanes</button>
            <button type="button" onClick={() => setLayoutMode("LIST")} className={`secondary-button flex h-10 items-center px-4 text-xs font-semibold uppercase tracking-[0.16em] ${layoutMode === "LIST" ? "text-white" : "text-white/58"}`}>Agenda</button>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/32">
              Sort
              <select className="soft-input h-10 rounded-2xl px-3 text-sm normal-case tracking-normal" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        {focusSpotlight ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/28">Spotlight issue</p>
              <h3 className="mt-3 text-xl font-semibold text-white/88">{focusSpotlight.title}</h3>
              <p className="mt-2 text-sm leading-7 text-white/44">{focusSpotlight.description || "Use the agenda view to inspect details while keeping the board filters active."}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/50">
                <span className="badge-pill">{ISSUE_TYPE_LABELS[focusSpotlight.issueType]}</span>
                <span className="badge-pill">{focusSpotlight.priority.toLowerCase()} priority</span>
                <span className="badge-pill">{focusSpotlight.assignee ? getPersonLabel(focusSpotlight.assignee) : "Unassigned"}</span>
                <span className="badge-pill">{focusSpotlight.sprint ? focusSpotlight.sprint.title : "Backlog"}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => { setLayoutMode("LIST"); setSelectedTaskId(focusSpotlight.id); }} className="accent-button flex h-10 items-center px-4 text-[11px] font-semibold uppercase tracking-[0.16em]">
                  Review in agenda
                </button>
                <button type="button" onClick={() => setViewMode("FOCUS")} className="secondary-button flex h-10 items-center px-4 text-[11px] font-semibold uppercase tracking-[0.16em]">
                  Focus only
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4"><p className="text-[11px] uppercase tracking-[0.18em] text-white/28">Overdue</p><p className="mt-2 text-2xl font-semibold text-white/88">{overdueCount}</p></div>
              <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4"><p className="text-[11px] uppercase tracking-[0.18em] text-white/28">Due soon</p><p className="mt-2 text-2xl font-semibold text-white/88">{dueSoonCount}</p></div>
              <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4"><p className="text-[11px] uppercase tracking-[0.18em] text-white/28">Assigned to you</p><p className="mt-2 text-2xl font-semibold text-white/88">{mineCount}</p></div>
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          <label className="flex flex-col gap-2 text-sm font-medium text-white/52 xl:col-span-2">Search issues
            <input ref={searchRef} className="soft-input h-11 rounded-2xl px-4 text-sm" placeholder="Press / to search title, notes, labels, assignee, sprint" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-white/52">Type<select className="soft-input h-11 rounded-2xl px-3 text-sm" value={issueTypeFilter} onChange={(event) => setIssueTypeFilter(event.target.value)}><option value="ALL">All issue types</option>{Object.entries(ISSUE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="flex flex-col gap-2 text-sm font-medium text-white/52">Priority<select className="soft-input h-11 rounded-2xl px-3 text-sm" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="ALL">All priorities</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></label>
          <label className="flex flex-col gap-2 text-sm font-medium text-white/52">Assignee<select className="soft-input h-11 rounded-2xl px-3 text-sm" value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}><option value="ALL">Everyone</option><option value="UNASSIGNED">Unassigned</option>{members.map((member) => <option key={member.id} value={member.id}>{getPersonLabel(member)}</option>)}</select></label>
          <label className="flex flex-col gap-2 text-sm font-medium text-white/52">Sprint<select className="soft-input h-11 rounded-2xl px-3 text-sm" value={sprintFilter} onChange={(event) => setSprintFilter(event.target.value)}><option value="ALL">All sprints</option><option value="BACKLOG">Backlog</option>{sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.isActive ? `[Active] ${sprint.title}` : sprint.title}</option>)}</select></label>
          <label className="flex flex-col gap-2 text-sm font-medium text-white/52">Due date<select className="soft-input h-11 rounded-2xl px-3 text-sm" value={dueFilter} onChange={(event) => setDueFilter(event.target.value)}>{DUE_FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}</select></label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
          <label className="flex flex-col gap-2 text-sm font-medium text-white/52">Label<select className="soft-input h-11 rounded-2xl px-3 text-sm" value={labelFilter} onChange={(event) => setLabelFilter(event.target.value)}><option value="ALL">All labels</option>{labelOptions.map((label) => <option key={label} value={label}>{label}</option>)}</select></label>
          <div className="flex items-end justify-between gap-3 text-xs text-white/32 md:justify-end">
            <span>Showing {filteredTasks.length} of {tasks.length} issues</span>
            <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/36"><input className="h-4 w-4 rounded border-white/20 bg-white/5" type="checkbox" checked={hideDone} onChange={(event) => setHideDone(event.target.checked)} />Hide done</label>
            <button className="secondary-button flex h-10 items-center px-4 text-[11px] font-semibold uppercase tracking-[0.16em]" type="button" onClick={handleClearFilters}>Clear filters</button>
          </div>
        </div>
      </div>

      {layoutMode === "BOARD" ? (
        <div id="board" className="grid gap-6 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const columnTasks = tasksByStatus[column.status];
            const isActiveDrop = dragOverStatus === column.status;
            return (
              <div key={column.status} className="flex flex-col gap-4">
                <div className={`panel-card-soft rounded-[28px] p-4 ${isActiveDrop ? "border-[var(--accent)]/25" : ""}`}>
                  <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-white/88">{column.label}</h2><p className="text-sm text-white/40">{column.helper}</p></div><span className="badge-pill px-3 py-1 text-[11px]">{columnTasks.length}</span></div>
                </div>
                <div className={`flex min-h-[120px] flex-col gap-4 rounded-[28px] border border-dashed p-3 transition ${isActiveDrop ? "border-[var(--accent)]/30 bg-[rgba(62,214,177,0.08)]" : "border-white/[0.1] bg-[rgba(7,18,25,0.36)]"}`} onDragOver={(event) => handleDragOver(event, column.status)} onDragLeave={() => setDragOverStatus(null)} onDrop={(event) => handleDrop(event, column.status)}>
                  {columnTasks.length ? columnTasks.map((task) => (
                    <div key={task.id} draggable onDragStart={(event) => handleDragStart(event, task.id)} onDragEnd={handleDragEnd} className={draggingId === task.id ? "opacity-60" : undefined}>
                      <TaskCard task={task} members={members} sprints={sprints} currentUserId={currentUserId} canDelete={canDeleteTasks} projectLabels={projectLabels} onNotify={pushNotification} />
                    </div>
                  )) : <div className="rounded-[24px] border border-dashed border-white/[0.1] bg-white/[0.03] p-6 text-sm text-white/28">No issues here yet. Drag an issue to update its status.</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div id="board" className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="panel-card rounded-[32px] p-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">Agenda view</p><p className="mt-2 text-sm text-white/42">A denser list for scanning and selecting a single issue.</p></div><span className="text-xs text-white/30">{sortedTasks.length} items</span></div>
            <div className="mt-4 grid gap-2">
              {sortedTasks.length ? sortedTasks.map((task) => {
                const isSelected = selectedTask?.id === task.id;
                return (
                  <button key={task.id} type="button" onClick={() => setSelectedTaskId(task.id)} className={`rounded-[24px] border px-4 py-4 text-left transition ${isSelected ? "border-[var(--accent)]/25 bg-[rgba(62,214,177,0.12)]" : "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/42"><span className="badge-pill px-3 py-1">{ISSUE_TYPE_LABELS[task.issueType]}</span><span>{task.sprint ? task.sprint.title : "Backlog"}</span></div>
                        <p className="mt-2 truncate text-sm font-semibold text-white/86">{task.title}</p>
                        <p className="mt-1 text-xs text-white/34">{task.assignee ? getPersonLabel(task.assignee) : "Unassigned"} / {task.priority.toLowerCase()} priority</p>
                      </div>
                      <div className="text-right text-xs text-white/34"><p>{formatDueLabel(task.dueDate)}</p><p className="mt-1">{task.comments.length} comments</p></div>
                    </div>
                  </button>
                );
              }) : <div className="rounded-[24px] border border-dashed border-white/[0.1] bg-white/[0.03] p-6 text-sm text-white/28">No issues match the current filters.</div>}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {selectedTask ? <TaskCard task={selectedTask} members={members} sprints={sprints} currentUserId={currentUserId} canDelete={canDeleteTasks} projectLabels={projectLabels} onNotify={pushNotification} /> : <div className="panel-card-soft rounded-[28px] p-6 text-sm text-white/32">Choose an issue to inspect it here.</div>}
          </div>
        </div>
      )}

      {notifications.length ? (
        <div className="fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-3">
          {notifications.map((note) => (
            <div key={note.id} className={`rounded-[22px] border px-4 py-3 text-sm shadow-lg ${note.type === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : note.type === "error" ? "border-red-500/20 bg-red-500/10 text-red-300" : "border-white/[0.08] bg-[#10202a] text-white/80"}`}>
              {note.message}
            </div>
          ))}
        </div>
      ) : null}

      <div id="activity">{isPending ? <p className="text-xs text-white/25">Syncing updates...</p> : null}</div>
    </section>
  );
}