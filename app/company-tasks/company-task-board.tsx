"use client";

import { Fragment, useMemo, useState } from "react";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
type Employee = { id: string; name: string | null; email: string };
type TaskComment = { id: string; content: string; createdAt: string; author: string; authorId: string };
type CompanyTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
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
const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Normal",
  HIGH: "High",
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [dueFilter, setDueFilter] = useState("ALL");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(employees[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, TaskComment[]>>({});
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const counts = useMemo(() => ({
    open: tasks.filter((task) => task.status === "TODO").length,
    inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    completed: tasks.filter((task) => task.status === "DONE").length,
  }), [tasks]);

  const currentDate = new Date();
  const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
  const visibleTasks = tasks.filter((task) => {
    const query = search.trim().toLocaleLowerCase();
    const matchesSearch = !query
      || task.title.toLocaleLowerCase().includes(query)
      || task.description?.toLocaleLowerCase().includes(query);
    const overdue = task.status !== "DONE" && task.dueDate !== null && task.dueDate.slice(0, 10) < today;
    return matchesSearch
      && (statusFilter === "ALL" || task.status === statusFilter)
      && (employeeFilter === "ALL" || task.assignee?.id === employeeFilter)
      && (priorityFilter === "ALL" || task.priority === priorityFilter)
      && (dueFilter === "ALL" || (dueFilter === "OVERDUE" ? overdue : Boolean(task.dueDate)));
  });

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingTask(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/company-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, assigneeId, dueDate: dueDate || null, priority }),
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
      setPriority("MEDIUM");
      setNotice("Task assigned.");
    } catch {
      setError("Unable to assign this task. Check your connection and try again.");
    } finally {
      setSavingTask(false);
    }
  }

  async function updatePriority(task: CompanyTask, nextPriority: TaskPriority) {
    setPendingId(task.id);
    setError(null);
    try {
      const response = await fetch(`/api/company-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: nextPriority }),
      });
      const data = await response.json() as { ok?: boolean; task?: CompanyTask; error?: string };
      if (!response.ok || !data.ok || !data.task) {
        setError(data.error || "Unable to update task priority.");
        return;
      }
      setTasks((current) => current.map((item) => item.id === task.id ? data.task! : item));
    } catch {
      setError("Unable to update task priority. Check your connection and try again.");
    } finally {
      setPendingId(null);
    }
  }

  async function reassignTask(task: CompanyTask, nextAssigneeId: string) {
    setPendingId(task.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/company-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: nextAssigneeId || null }),
      });
      const data = await response.json() as { ok?: boolean; task?: CompanyTask; error?: string };
      if (!response.ok || !data.ok || !data.task) {
        setError(data.error || "Unable to reassign this task.");
        return;
      }
      setTasks((current) => current.map((item) => item.id === task.id ? data.task! : item));
      setNotice(nextAssigneeId ? `Task reassigned to ${employeeLabel(data.task.assignee)}.` : "Task is now unassigned.");
    } catch {
      setError("Unable to reassign this task. Check your connection and try again.");
    } finally {
      setPendingId(null);
    }
  }

  async function toggleComments(taskId: string) {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
      return;
    }
    setExpandedTaskId(taskId);
    setCommentDraft("");
    if (comments[taskId]) return;

    setCommentsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/company-tasks/${taskId}/comments`, { cache: "no-store" });
      const data = await response.json() as { ok?: boolean; comments?: TaskComment[]; error?: string };
      if (!response.ok || !data.ok || !data.comments) {
        setError(data.error || "Unable to load task updates.");
        return;
      }
      setComments((current) => ({ ...current, [taskId]: data.comments! }));
    } catch {
      setError("Unable to load task updates. Check your connection and try again.");
    } finally {
      setCommentsLoading(false);
    }
  }

  async function addComment(event: React.FormEvent<HTMLFormElement>, taskId: string) {
    event.preventDefault();
    setCommentSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/company-tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentDraft }),
      });
      const data = await response.json() as { ok?: boolean; comment?: TaskComment; error?: string };
      if (!response.ok || !data.ok || !data.comment) {
        setError(data.error || "Unable to post this update.");
        return;
      }
      setComments((current) => ({
        ...current,
        [taskId]: [...(current[taskId] ?? []), data.comment!],
      }));
      setCommentDraft("");
    } catch {
      setError("Unable to post this update. Check your connection and try again.");
    } finally {
      setCommentSubmitting(false);
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
              <label className="grid gap-1.5 text-xs font-medium text-white/55">
                Priority
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as TaskPriority)}
                  className="soft-input h-11 rounded-xl px-3 text-sm"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Normal</option>
                  <option value="HIGH">High</option>
                </select>
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
          <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <input
              type="search"
              aria-label="Search tasks"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search task title or details"
              className="soft-input h-9 rounded-lg px-3 text-xs sm:col-span-2 lg:col-span-1"
            />
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
            <select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="soft-input h-9 rounded-lg px-2 text-xs">
              <option value="ALL">All priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Normal</option>
              <option value="LOW">Low</option>
            </select>
            <select aria-label="Filter by due date" value={dueFilter} onChange={(event) => setDueFilter(event.target.value)} className="soft-input h-9 rounded-lg px-2 text-xs">
              <option value="ALL">All due dates</option>
              <option value="OVERDUE">Overdue only</option>
              <option value="HAS_DUE_DATE">Has a due date</option>
            </select>
          </div>
        </div>

        {error ? <p role="alert" className="mx-5 mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}
        {notice ? <p role="status" className="mx-5 mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</p> : null}

        {visibleTasks.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="text-[11px] uppercase tracking-wider text-white/35">
                <tr>
                  <th className="px-5 py-3 font-semibold">Task</th>
                  {isAdmin ? <th className="px-4 py-3 font-semibold">Assigned to</th> : null}
                  <th className="px-4 py-3 font-semibold">Due date</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {visibleTasks.map((task) => (
                  <Fragment key={task.id}>
                    <tr>
                      <td className="max-w-[30rem] px-5 py-4">
                        <p className="text-sm font-medium text-white/85">{task.title}</p>
                        {task.description ? <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-white/40">{task.description}</p> : null}
                        <button type="button" onClick={() => void toggleComments(task.id)} className="mt-2 text-xs font-medium text-indigo-300 hover:text-indigo-200">
                          {expandedTaskId === task.id ? "Hide updates" : "Progress updates"}
                          {comments[task.id] ? ` (${comments[task.id].length})` : ""}
                        </button>
                      </td>
                      {isAdmin ? (
                        <td className="px-4 py-4">
                          <select
                            aria-label={`Reassign ${task.title}`}
                            value={task.assignee?.id ?? ""}
                            onChange={(event) => void reassignTask(task, event.target.value)}
                            disabled={pendingId === task.id}
                            className="soft-input h-9 max-w-48 rounded-lg px-2 text-xs disabled:opacity-50"
                          >
                            <option value="">Unassigned</option>
                            {task.assignee && !employees.some((employee) => employee.id === task.assignee?.id) ? (
                              <option value={task.assignee.id}>{employeeLabel(task.assignee)} (inactive)</option>
                            ) : null}
                            {employees.map((employee) => (
                              <option key={employee.id} value={employee.id}>{employeeLabel(employee)}</option>
                            ))}
                          </select>
                        </td>
                      ) : null}
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-white/55">
                        {task.dueDate && task.status !== "DONE" && task.dueDate.slice(0, 10) < today ? (
                          <span className="inline-flex items-center gap-2">
                            {formatDueDate(task.dueDate)}
                            <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-1 text-[10px] font-semibold text-rose-300">Overdue</span>
                          </span>
                        ) : formatDueDate(task.dueDate)}
                      </td>
                      <td className="px-4 py-4">
                        {isAdmin ? (
                          <select
                            aria-label={`Priority for ${task.title}`}
                            value={task.priority}
                            onChange={(event) => void updatePriority(task, event.target.value as TaskPriority)}
                            disabled={pendingId === task.id}
                            className="soft-input h-9 rounded-lg px-2 text-xs disabled:opacity-50"
                          >
                            {(Object.keys(priorityLabels) as TaskPriority[]).map((value) => (
                              <option key={value} value={value}>{priorityLabels[value]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`text-xs font-medium ${task.priority === "HIGH" ? "text-rose-300" : task.priority === "LOW" ? "text-white/40" : "text-white/60"}`}>
                            {priorityLabels[task.priority]}
                          </span>
                        )}
                      </td>
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
                    {expandedTaskId === task.id ? (
                      <tr key={`${task.id}-comments`}>
                        <td colSpan={isAdmin ? 5 : 4} className="bg-white/[0.025] px-5 py-4">
                          <div className="mx-auto max-w-3xl">
                            <h3 className="text-sm font-semibold text-white/80">Progress updates</h3>
                            {commentsLoading ? <p className="mt-3 text-xs text-white/40">Loading updates...</p> : null}
                            {comments[task.id]?.length ? (
                              <div className="mt-3 grid gap-2">
                                {comments[task.id].map((comment) => (
                                  <article key={comment.id} className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
                                    <div className="flex flex-wrap justify-between gap-2">
                                      <p className="text-xs font-semibold text-white/70">{comment.author}</p>
                                      <time className="text-[10px] text-white/35">{new Date(comment.createdAt).toLocaleString()}</time>
                                    </div>
                                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/55">{comment.content}</p>
                                  </article>
                                ))}
                              </div>
                            ) : !commentsLoading && comments[task.id] ? (
                              <p className="mt-2 text-xs text-white/40">No updates yet.</p>
                            ) : null}
                            <form onSubmit={(event) => void addComment(event, task.id)} className="mt-3 flex flex-col gap-2 sm:flex-row">
                              <textarea
                                required
                                maxLength={2000}
                                rows={2}
                                value={commentDraft}
                                onChange={(event) => setCommentDraft(event.target.value)}
                                placeholder={isAdmin ? "Add an update for the employee..." : "Share progress or explain what's blocking you..."}
                                className="soft-input min-h-11 flex-1 rounded-xl px-3 py-2 text-sm"
                              />
                              <button type="submit" disabled={commentSubmitting || !commentDraft.trim()} className="secondary-button h-10 px-4 text-xs font-semibold disabled:opacity-50">
                                {commentSubmitting ? "Posting..." : "Post update"}
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
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
