"use client";

import { useMemo, useState } from "react";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type Employee = { id: string; name: string | null; email: string };
type CompanyTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: Employee | null;
};

const statusLabels: Record<TaskStatus, string> = {
  TODO: "Not started",
  IN_PROGRESS: "In progress",
  DONE: "Completed",
};

function employeeLabel(employee: Employee | null) {
  return employee ? employee.name || employee.email : "Unassigned";
}

function formatDueDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    : "No due date";
}

export default function CompanyTaskBoard({
  isAdmin,
  employees,
  initialTasks,
}: {
  isAdmin: boolean;
  employees: Employee[];
  initialTasks: CompanyTask[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(employees[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const counts = useMemo(() => ({
    open: tasks.filter((task) => task.status === "TODO").length,
    inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    completed: tasks.filter((task) => task.status === "DONE").length,
  }), [tasks]);

  const visibleTasks = tasks.filter((task) =>
    (statusFilter === "ALL" || task.status === statusFilter) &&
    (employeeFilter === "ALL" || task.assignee?.id === employeeFilter),
  );

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingTask(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/company-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, assigneeId, dueDate: dueDate || null }),
      });
      const data = await response.json() as { ok?: boolean; task?: CompanyTask; error?: string };
      if (!response.ok || !data.ok || !data.task) {
        setError(data.error || "Unable to assign this task.");
        return;
      }
      setTasks((current) => [data.task!, ...current]);
      setTitle("");
      setDescription("");
      setDueDate("");
      setNotice("Task assigned.");
    } catch {
      setError("Unable to assign this task. Check your connection and try again.");
    } finally {
      setSavingTask(false);
    }
  }

  async function updateStatus(task: CompanyTask, status: TaskStatus) {
    setPendingId(task.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/company-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json() as { ok?: boolean; task?: CompanyTask; error?: string };
      if (!response.ok || !data.ok || !data.task) {
        setError(data.error || "Unable to update task status.");
        return;
      }
      setTasks((current) => current.map((item) => item.id === task.id ? data.task! : item));
    } catch {
      setError("Unable to update task status. Check your connection and try again.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {isAdmin ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Not started", counts.open],
              ["In progress", counts.inProgress],
              ["Completed", counts.completed],
            ].map(([label, count]) => (
              <div key={label} className="panel-card-soft rounded-2xl p-4">
                <p className="text-xs font-medium text-white/45">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-white/90">{count}</p>
              </div>
            ))}
          </div>

          <section className="panel-card rounded-3xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white/90">Assign a task</h2>
            <p className="mt-1 text-sm text-white/45">Create a task and assign it to one employee.</p>
            <form onSubmit={(event) => void createTask(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-medium text-white/55 sm:col-span-2">
                Task
                <input
                  required
                  minLength={2}
                  maxLength={200}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="What needs to be done?"
                  className="soft-input h-11 rounded-xl px-3 text-sm"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-white/55 sm:col-span-2">
                Details (optional)
                <textarea
                  maxLength={2000}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Add any useful instructions"
                  rows={2}
                  className="soft-input rounded-xl px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-white/55">
                Assign to
                <select
                  required
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                  disabled={!employees.length}
                  className="soft-input h-11 rounded-xl px-3 text-sm"
                >
                  {employees.length ? employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employeeLabel(employee)}</option>
                  )) : <option value="">No employee accounts available</option>}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-white/55">
                Due date (optional)
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="soft-input h-11 rounded-xl px-3 text-sm"
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={savingTask || !employees.length}
                  className="accent-button h-10 px-4 text-sm font-semibold disabled:opacity-50"
                >
                  {savingTask ? "Assigning..." : "Assign task"}
                </button>
              </div>
            </form>
          </section>
        </>
      ) : (
        <section className="panel-card rounded-3xl p-5 sm:p-6">
          <p className="section-kicker">My assigned work</p>
          <h2 className="mt-2 text-2xl font-semibold text-white/90">Your tasks</h2>
          <p className="mt-2 text-sm text-white/45">Update a task as you start or complete it. Your administrator can track progress.</p>
        </section>
      )}

      <section className="panel-card overflow-hidden rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div>
            <h2 className="font-semibold text-white/90">{isAdmin ? "Company tasks" : "Assigned to me"}</h2>
            <p className="mt-1 text-xs text-white/40">{visibleTasks.length} {visibleTasks.length === 1 ? "task" : "tasks"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin ? (
              <select aria-label="Filter by employee" value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} className="soft-input h-9 rounded-lg px-2 text-xs">
                <option value="ALL">All employees</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeLabel(employee)}</option>)}
              </select>
            ) : null}
            <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="soft-input h-9 rounded-lg px-2 text-xs">
              <option value="ALL">All statuses</option>
              <option value="TODO">Not started</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="DONE">Completed</option>
            </select>
          </div>
        </div>

        {error ? <p role="alert" className="mx-5 mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}
        {notice ? <p role="status" className="mx-5 mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</p> : null}

        {visibleTasks.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="text-[11px] uppercase tracking-wider text-white/35">
                <tr>
                  <th className="px-5 py-3 font-semibold">Task</th>
                  {isAdmin ? <th className="px-4 py-3 font-semibold">Assigned to</th> : null}
                  <th className="px-4 py-3 font-semibold">Due date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {visibleTasks.map((task) => (
                  <tr key={task.id}>
                    <td className="max-w-[30rem] px-5 py-4">
                      <p className="text-sm font-medium text-white/85">{task.title}</p>
                      {task.description ? <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-white/40">{task.description}</p> : null}
                    </td>
                    {isAdmin ? <td className="px-4 py-4 text-sm text-white/55">{employeeLabel(task.assignee)}</td> : null}
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-white/55">{formatDueDate(task.dueDate)}</td>
                    <td className="px-4 py-4">
                      <select
                        aria-label={`Status for ${task.title}`}
                        value={task.status}
                        onChange={(event) => void updateStatus(task, event.target.value as TaskStatus)}
                        disabled={pendingId === task.id}
                        className="soft-input h-9 rounded-lg px-2 text-xs disabled:opacity-50"
                      >
                        {(Object.keys(statusLabels) as TaskStatus[]).map((status) => (
                          <option key={status} value={status}>{statusLabels[status]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-white/70">{tasks.length ? "No tasks match these filters." : isAdmin ? "No tasks assigned yet." : "You have no assigned tasks yet."}</p>
            {!tasks.length && isAdmin ? <p className="mt-1 text-xs text-white/40">Use the form above to assign the first one.</p> : null}
          </div>
        )}
      </section>
    </div>
  );
}
