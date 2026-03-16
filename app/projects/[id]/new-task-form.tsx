"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type NotificationType = "success" | "error" | "info";

type ProjectMember = {
  id: string;
  name: string | null;
  email: string;
  role: "OWNER" | "MEMBER";
};

type SprintOption = {
  id: string;
  title: string;
  isActive: boolean;
};

type NewTaskFormProps = {
  projectId: string;
  members: ProjectMember[];
  sprints: SprintOption[];
  onNotify?: (message: string, type?: NotificationType) => void;
};

function getPersonLabel(member: { name: string | null; email: string }) {
  return member.name || member.email;
}

export default function NewTaskForm({
  projectId,
  members,
  sprints,
  onNotify,
}: NewTaskFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const issueType = String(formData.get("issueType") || "TASK");
    const status = String(formData.get("status") || "TODO");
    const priority = String(formData.get("priority") || "MEDIUM");
    const storyPoints = String(formData.get("storyPoints") || "").trim();
    const dueDate = String(formData.get("dueDate") || "").trim();
    const assigneeId = String(formData.get("assigneeId") || "").trim();
    const sprintId = String(formData.get("sprintId") || "").trim();

    if (title.length < 2) {
      setError("Task title must be at least 2 characters.");
      return;
    }

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        title,
        description,
        issueType,
        status,
        priority,
        storyPoints: storyPoints || null,
        dueDate: dueDate || null,
        assigneeId: assigneeId || null,
        sprintId: sprintId || null,
      }),
    });

    if (response.ok) {
      form.reset();
      onNotify?.(`Created ${issueType.toLowerCase()} \"${title}\"`, "success");
      startTransition(() => {
        router.refresh();
      });
      return;
    }

    const data = await response.json().catch(() => ({}));
    const message = data.error || "Unable to create task.";
    setError(message);
    onNotify?.(message, "error");
  };

  return (
    <form
      className="flex flex-col gap-4 rounded-xl border border-white/[0.07] bg-[#1a1d27] p-6"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white/85">Create issue</h3>
          <p className="text-sm text-white/35">
            Add work to the backlog or plan it straight into a sprint.
          </p>
        </div>
        <button
          className="flex h-8 items-center rounded-lg bg-indigo-500 px-4 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Creating..." : "+ Create issue"}
        </button>
      </div>
      <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
        Title
        <input
          className="h-10 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
          name="title"
          type="text"
          placeholder="Checkout error handling"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
        Description
        <textarea
          className="min-h-[96px] rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
          name="description"
          placeholder="Optional context, notes, or acceptance criteria"
          rows={3}
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
          Issue type
          <select
            className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
            name="issueType"
            defaultValue="TASK"
          >
            <option value="EPIC">Epic</option>
            <option value="STORY">Story</option>
            <option value="TASK">Task</option>
            <option value="BUG">Bug</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
          Status
          <select
            className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
            name="status"
            defaultValue="TODO"
          >
            <option value="TODO">Todo</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="DONE">Done</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
          Priority
          <select
            className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
            name="priority"
            defaultValue="MEDIUM"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
          Story points
          <input
            className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
            name="storyPoints"
            type="number"
            min="1"
            max="100"
            step="1"
            placeholder="Optional"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
          Due date
          <input
            className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
            name="dueDate"
            type="date"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
          Assignee
          <select
            className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
            name="assigneeId"
            defaultValue=""
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {getPersonLabel(member)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-white/55">
          Sprint
          <select
            className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
            name="sprintId"
            defaultValue=""
          >
            <option value="">Backlog</option>
            {sprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.isActive ? `[Active] ${sprint.title}` : sprint.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </form>
  );
}