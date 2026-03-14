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
  const [labelColor, setLabelColor] = useState("#3f3f46");
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
      `Delete "${task.title}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      onNotify?.(`Deleted "${task.title}"`, "success");
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
      onNotify?.(`Label "${name}" added.`, "success");
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
        className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        onSubmit={handleSave}
      >
        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          Title
          <input
            className="h-10 rounded-xl border border-zinc-200 px-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          Description
          <textarea
            className="min-h-[80px] rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            Status
            <select
              className="h-10 rounded-xl border border-zinc-200 bg-white px-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as TaskStatus)
              }
            >
              <option value="TODO">Todo</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            Priority
            <select
              className="h-10 rounded-xl border border-zinc-200 bg-white px-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as TaskPriority)
              }
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            Due date
            <input
              className="h-10 rounded-xl border border-zinc-200 px-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
        </div>
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            className="h-9 rounded-full bg-zinc-900 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Saving" : "Save"}
          </button>
          <button
            className="h-9 rounded-full border border-zinc-200 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-700"
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

  const dueLabel = formatDueDate(task.dueDate);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{task.title}</h3>
          {task.description ? (
            <p className="mt-2 text-sm text-zinc-600">{task.description}</p>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">No description yet.</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {task.status !== "DONE" ? (
            <button
              className="h-8 rounded-full border border-zinc-200 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-700"
              type="button"
              onClick={handleMarkDone}
              disabled={isPending}
            >
              Mark done
            </button>
          ) : null}
          <button
            className="h-8 rounded-full border border-zinc-200 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-700"
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={isPending}
          >
            Edit
          </button>
          <button
            className="h-8 rounded-full border border-zinc-200 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-700"
            type="button"
            onClick={handleDelete}
            disabled={isPending}
          >
            Delete
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
        <span className="rounded-full border border-zinc-200 px-2 py-1">
          Status: {STATUS_LABELS[task.status]}
        </span>
        <span className="rounded-full border border-zinc-200 px-2 py-1">
          Priority: {PRIORITY_LABELS[task.priority]}
        </span>
        {dueLabel ? (
          <span className="rounded-full border border-zinc-200 px-2 py-1">
            Due {dueLabel}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {task.labels.length ? (
          task.labels.map((label) => (
            <span
              key={label.id}
              className="rounded-full border px-2 py-1 text-xs font-medium"
              style={{
                borderColor: label.color ?? "#e4e4e7",
                color: label.color ?? "#52525b",
                backgroundColor: label.color ? `${label.color}1A` : "transparent",
              }}
            >
              {label.name}
            </span>
          ))
        ) : (
          <span className="text-xs text-zinc-400">No labels yet.</span>
        )}
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={handleAddLabel}
      >
        <input
          className="h-9 flex-1 rounded-xl border border-zinc-200 px-3 text-xs text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400"
          placeholder="Add label"
          value={labelName}
          onChange={(event) => setLabelName(event.target.value)}
        />
        <input
          className="h-9 w-10 rounded-xl border border-zinc-200 bg-white"
          type="color"
          value={labelColor}
          onChange={(event) => setLabelColor(event.target.value)}
          aria-label="Label color"
        />
        <button
          className="h-9 rounded-full border border-zinc-200 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-700"
          type="submit"
          disabled={isPending}
        >
          Add
        </button>
      </form>
      {labelError ? <p className="text-xs text-red-600">{labelError}</p> : null}

      <div className="border-t border-zinc-100 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Comments
          </p>
          <span className="text-xs text-zinc-400">
            {task.comments.length} total
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {task.comments.length ? (
            task.comments.map((comment) => {
              const timestamp = formatCommentDate(comment.createdAt);
              return (
                <div
                  key={comment.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
                >
                  <p className="text-sm text-zinc-700">{comment.content}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {comment.author}
                    {timestamp ? ` · ${timestamp}` : ""}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-zinc-400">No comments yet.</p>
          )}
        </div>
        <form className="mt-3 flex flex-col gap-2" onSubmit={handleAddComment}>
          <textarea
            className="min-h-[72px] rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400"
            placeholder="Write a comment"
            value={commentBody}
            onChange={(event) => setCommentBody(event.target.value)}
          />
          <div className="flex items-center justify-between gap-2">
            {commentError ? (
              <span className="text-xs text-red-600">{commentError}</span>
            ) : (
              <span className="text-xs text-zinc-400">
                Keep it short and actionable.
              </span>
            )}
            <button
              className="h-9 rounded-full bg-zinc-900 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isPending}
            >
              Add comment
            </button>
          </div>
        </form>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
