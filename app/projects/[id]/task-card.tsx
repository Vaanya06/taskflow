"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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

type NotificationType = "success" | "error" | "info";

type TaskCardProps = {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string | null;
    labels: TaskLabel[];
    comments: TaskComment[];
  };
  onNotify?: (message: string, type?: NotificationType) => void;
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

function formatDueDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCommentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDueMeta(value: string | null, status: TaskStatus) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const today = startOfToday();
  const due = startOfDate(date);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (status !== "DONE" && diff < 0) {
    return {
      label: `${Math.abs(diff)}d overdue`,
      className: "border-red-500/20 bg-red-500/10 text-red-300",
    };
  }

  if (status !== "DONE" && diff === 0) {
    return {
      label: "Due today",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    };
  }

  if (status !== "DONE" && diff <= 3) {
    return {
      label: diff === 1 ? "Due tomorrow" : `Due in ${diff}d`,
      className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    };
  }

  return {
    label: `Due ${formatDueDate(value)}`,
    className: "border-white/10 bg-white/5 text-white/55",
  };
}

export default function TaskCard({ task, onNotify }: TaskCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(() =>
    task.dueDate ? task.dueDate.slice(0, 10) : "",
  );
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("#6366f1");
  const [commentBody, setCommentBody] = useState("");

  const handleUpdate = async (
    payload: Record<string, unknown>,
    successMessage = "Task updated.",
  ) => {
    setError(null);
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      onNotify?.(successMessage, "success");
      startTransition(() => {
        router.refresh();
      });
      return true;
    }

    const data = await response.json().catch(() => ({}));
    const message = data.error || "Unable to update task.";
    setError(message);
    onNotify?.(message, "error");
    return false;
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (title.trim().length < 2) {
      setError("Task title must be at least 2 characters.");
      return;
    }

    const success = await handleUpdate(
      {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        dueDate: dueDate || null,
      },
      "Task updated.",
    );

    if (success) {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete ${task.title}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      onNotify?.(`Deleted ${task.title}`, "success");
      startTransition(() => {
        router.refresh();
      });
      return;
    }

    const data = await response.json().catch(() => ({}));
    const message = data.error || "Unable to delete task.";
    setError(message);
    onNotify?.(message, "error");
  };

  const handleMarkDone = async () => {
    await handleUpdate({ status: "DONE" }, "Task marked done.");
  };

  const handleAddLabel = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLabelError(null);

    const name = labelName.trim();
    if (name.length < 2) {
      setLabelError("Label name must be at least 2 characters.");
      return;
    }

    const response = await fetch(`/api/tasks/${task.id}/labels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        color: labelColor,
      }),
    });

    if (response.ok) {
      setLabelName("");
      onNotify?.(`Label ${name} added.`, "success");
      startTransition(() => {
        router.refresh();
      });
      return;
    }

    const data = await response.json().catch(() => ({}));
    const message = data.error || "Unable to add label.";
    setLabelError(message);
    onNotify?.(message, "error");
  };

  const handleAddComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCommentError(null);

    const content = commentBody.trim();
    if (!content) {
      setCommentError("Comment cannot be empty.");
      return;
    }

    const response = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });

    if (response.ok) {
      setCommentBody("");
      onNotify?.("Comment added.", "success");
      startTransition(() => {
        router.refresh();
      });
      return;
    }

    const data = await response.json().catch(() => ({}));
    const message = data.error || "Unable to add comment.";
    setCommentError(message);
    onNotify?.(message, "error");
  };

  if (isEditing) {
    return (
      <form
        className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-[#1a1d27] p-5 shadow-sm"
        onSubmit={handleSave}
      >
        <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
          Title
          <input
            className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
          Description
          <textarea
            className="min-h-[80px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
            Status
            <select
              className="h-10 rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
            >
              <option value="TODO">Todo</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
            Priority
            <select
              className="h-10 rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
            Due date
            <input
              className="h-10 rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
        </div>
        {error ? (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            className="flex h-8 items-center rounded-lg bg-indigo-500 px-4 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Save"}
          </button>
          <button
            className="flex h-8 items-center rounded-lg border border-white/10 px-4 text-xs font-semibold text-white/40 transition hover:text-white/70"
            type="button"
            onClick={() => {
              setIsEditing(false);
              setError(null);
              setTitle(task.title);
              setDescription(task.description ?? "");
              setStatus(task.status);
              setPriority(task.priority);
              setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  const dueMeta = getDueMeta(task.dueDate, task.status);
  const latestComment = task.comments[task.comments.length - 1];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-[#1a1d27] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-white/85">{task.title}</h3>
          {task.description ? (
            <p className="mt-2 text-sm text-white/45">{task.description}</p>
          ) : (
            <p className="mt-2 text-sm text-white/25">No description yet.</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {task.status !== "DONE" ? (
            <button
              className="flex h-7 items-center rounded-lg border border-white/10 bg-white/5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45 transition hover:border-white/20 hover:text-white/75"
              type="button"
              onClick={handleMarkDone}
              disabled={isPending}
            >
              Mark done
            </button>
          ) : null}
          <button
            className="flex h-7 items-center rounded-lg border border-white/10 bg-white/5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45 transition hover:border-white/20 hover:text-white/75"
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={isPending}
          >
            Edit
          </button>
          <button
            className="flex h-7 items-center rounded-lg border border-red-500/20 bg-red-500/5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-400/60 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
            type="button"
            onClick={handleDelete}
            disabled={isPending}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-white/10 px-2 py-1 text-white/45">
          Status: {STATUS_LABELS[task.status]}
        </span>
        <span className="rounded-full border border-white/10 px-2 py-1 text-white/45">
          Priority: {PRIORITY_LABELS[task.priority]}
        </span>
        {dueMeta ? (
          <span className={`rounded-full border px-2 py-1 ${dueMeta.className}`}>
            {dueMeta.label}
          </span>
        ) : null}
        <span className="rounded-full border border-white/10 px-2 py-1 text-white/45">
          {task.comments.length} comments
        </span>
      </div>

      {latestComment ? (
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/35">
          Latest: {latestComment.author} commented {formatCommentDate(latestComment.createdAt) ?? "recently"}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {task.labels.length ? (
          task.labels.map((label) => (
            <span
              key={label.id}
              className="rounded-full border px-2 py-1 text-xs font-medium"
              style={{
                borderColor: label.color ?? "#3f3f46",
                color: label.color ?? "#d4d4d8",
                backgroundColor: label.color ? `${label.color}20` : "rgba(255,255,255,0.04)",
              }}
            >
              {label.name}
            </span>
          ))
        ) : (
          <span className="text-xs text-white/25">No labels yet.</span>
        )}
      </div>

      <form className="flex flex-wrap items-center gap-2" onSubmit={handleAddLabel}>
        <input
          className="h-9 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
          placeholder="Add label"
          value={labelName}
          onChange={(event) => setLabelName(event.target.value)}
        />
        <input
          className="h-9 w-10 rounded-lg border border-white/10 bg-white/5"
          type="color"
          value={labelColor}
          onChange={(event) => setLabelColor(event.target.value)}
          aria-label="Label color"
        />
        <button
          className="flex h-9 items-center rounded-lg border border-white/10 bg-white/5 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/45 transition hover:border-white/20 hover:text-white/75"
          type="submit"
          disabled={isPending}
        >
          Add
        </button>
      </form>
      {labelError ? <p className="text-xs text-red-400">{labelError}</p> : null}

      <div className="border-t border-white/[0.06] pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/25">
            Comments
          </p>
          <span className="text-xs text-white/25">{task.comments.length} total</span>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {task.comments.length ? (
            task.comments.map((comment) => {
              const timestamp = formatCommentDate(comment.createdAt);
              return (
                <div
                  key={comment.id}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <p className="text-sm text-white/55">{comment.content}</p>
                  <p className="mt-1 text-xs text-white/25">
                    {comment.author}
                    {timestamp ? ` · ${timestamp}` : ""}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-white/25">No comments yet.</p>
          )}
        </div>
        <form className="mt-3 flex flex-col gap-2" onSubmit={handleAddComment}>
          <textarea
            className="min-h-[72px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
            placeholder="Write a comment"
            value={commentBody}
            onChange={(event) => setCommentBody(event.target.value)}
          />
          <div className="flex items-center justify-between gap-2">
            {commentError ? (
              <span className="text-xs text-red-400">{commentError}</span>
            ) : (
              <span className="text-xs text-white/25">Keep it short and actionable.</span>
            )}
            <button
              className="flex h-8 items-center rounded-lg bg-indigo-500 px-4 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isPending}
            >
              Add comment
            </button>
          </div>
        </form>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
