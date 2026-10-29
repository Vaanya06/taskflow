"use client";

import { useMemo, useState } from "react";

type WorkloadTask = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  dueDate: string | null;
  assignee: { id: string; name: string | null; email: string } | null;
};

type WorkloadMember = {
  id: string;
  name: string | null;
  email: string;
  accessRole: string;
};

type TeamWorkloadProps = {
  projectId: string;
  tasks: WorkloadTask[];
  members: WorkloadMember[];
  currentUserId: string;
  canViewAll: boolean;
};

const STATUS_LABELS: Record<WorkloadTask["status"], string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

function memberLabel(member: WorkloadMember) {
  return member.name || member.email;
}

function formatDueDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDueDateState(value: string | null, now: Date) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysUntilDue = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
  return { date, daysUntilDue };
}

export default function TeamWorkload({
  projectId,
  tasks,
  members,
  currentUserId,
  canViewAll,
}: TeamWorkloadProps) {
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const today = useMemo(() => new Date(), []);
  const visibleMembers = canViewAll
    ? members
    : members.filter((member) => member.id === currentUserId);
  const openTasks = tasks.filter((task) => task.status !== "DONE");
  const upcomingTasks = openTasks.filter((task) => {
    const due = getDueDateState(task.dueDate, today);
    return due !== null && due.daysUntilDue >= 0 && due.daysUntilDue <= 7;
  });
  const filteredTasks = tasks.filter((task) => {
    if (statusFilter === "OPEN" && task.status === "DONE") {
      return false;
    }
    if (statusFilter !== "ALL" && statusFilter !== "OPEN" && task.status !== statusFilter) {
      return false;
    }
    if (assigneeFilter === "UNASSIGNED" && task.assignee) {
      return false;
    }
    if (assigneeFilter !== "ALL" && assigneeFilter !== "UNASSIGNED" && task.assignee?.id !== assigneeFilter) {
      return false;
    }
    return true;
  }).sort((left, right) => {
    if (!left.dueDate) return 1;
    if (!right.dueDate) return -1;
    return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
  });

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-800">Who can see which work?</h2>
        <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-600 sm:grid-cols-2">
          <p><span className="font-semibold text-slate-800">Owners, team managers, and project members:</span> can see all project issues and workload.</p>
          <p><span className="font-semibold text-slate-800">Team members:</span> can see issues assigned to themselves and unassigned issues, but not other teammates&apos; assigned work.</p>
        </div>
        {!canViewAll ? (
          <p className="mt-3 border-t border-indigo-100 pt-3 text-xs leading-5 text-slate-500">
            Workload totals and due dates below are limited to the issues visible to you. Other teammates&apos; private assignment counts are not included.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03]">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Visible open work</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{openTasks.length}</p>
          <p className="mt-1 text-sm text-slate-500">Across issues you can access</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03]">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Due in the next 7 days</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{upcomingTasks.length}</p>
          <p className="mt-1 text-sm text-slate-500">Open issues with upcoming deadlines</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Team workload</h2>
            <p className="mt-1 text-sm text-slate-500">
              {canViewAll ? "Open issues and upcoming due dates across the project." : "Your visible work and the unassigned queue."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
              Assignee
              <select
                className="soft-input h-10 min-w-40 rounded-xl px-3 text-sm"
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
              >
                <option value="ALL">All visible assignees</option>
                {!canViewAll ? <option value={currentUserId}>My work</option> : null}
                <option value="UNASSIGNED">Unassigned</option>
                {canViewAll ? members.map((member) => (
                  <option key={member.id} value={member.id}>{memberLabel(member)}</option>
                )) : null}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
              Status
              <select
                className="soft-input h-10 min-w-36 rounded-xl px-3 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="OPEN">All open</option>
                <option value="ALL">All statuses</option>
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </label>
          </div>
        </div>

        {canViewAll ? (
          <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleMembers.map((member) => {
              const memberOpen = openTasks.filter((task) => task.assignee?.id === member.id);
              const memberDue = memberOpen.filter((task) => {
                const due = getDueDateState(task.dueDate, today);
                return due !== null && due.daysUntilDue >= 0 && due.daysUntilDue <= 7;
              }).length;
              return (
                <article key={member.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{memberLabel(member)}</p>
                      <p className="mt-1 text-xs text-slate-500">{member.accessRole}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{memberOpen.length} open</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{memberDue} due within 7 days</p>
                </article>
              );
            })}
            <article className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-4">
              <p className="text-sm font-semibold text-slate-700">Unassigned</p>
              <p className="mt-1 text-xs text-slate-500">Open issues waiting for an owner</p>
              <p className="mt-3 text-xs font-medium text-slate-600">{openTasks.filter((task) => !task.assignee).length} open</p>
            </article>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead className="bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-3">Issue</th>
                <th scope="col" className="px-5 py-3">Assignee</th>
                <th scope="col" className="px-5 py-3">Status</th>
                <th scope="col" className="px-5 py-3">Due date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length ? filteredTasks.map((task) => {
                const due = getDueDateState(task.dueDate, today);
                const dueLabel = !due
                  ? "No due date"
                  : due.daysUntilDue < 0
                    ? `${formatDueDate(task.dueDate!)} · overdue`
                    : due.daysUntilDue === 0
                      ? `${formatDueDate(task.dueDate!)} · today`
                      : formatDueDate(task.dueDate!);
                return (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <a className="text-sm font-medium text-indigo-700 hover:text-indigo-900 hover:underline" href={`/projects/${projectId}?tab=board&taskId=${task.id}`}>
                        {task.title}
                      </a>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{task.assignee?.name || task.assignee?.email || "Unassigned"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${task.status === "DONE" ? "bg-emerald-50 text-emerald-700" : task.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABELS[task.status]}
                      </span>
                    </td>
                    <td className={`px-5 py-3.5 text-sm ${due && due.daysUntilDue < 0 ? "font-medium text-red-600" : "text-slate-600"}`}>{dueLabel}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-500">No issues match these assignee and status filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
          Showing {filteredTasks.length} of {tasks.length} issues visible to you.
        </p>
      </div>
    </section>
  );
}
