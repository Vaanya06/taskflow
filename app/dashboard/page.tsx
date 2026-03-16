import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accessibleProjectWhere } from "@/project-access";
import DeleteProjectButton from "./delete-project-button";
import LogoutButton from "./logout-button";
import NewProjectForm from "./new-project-form";

type DashboardTask = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: Date | null;
  updatedAt: Date;
  projectId: string;
  assignee: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  project: {
    title: string;
  };
};

function formatProjectDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatActivityDate(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDueDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isWithinNextDays(date: Date, days: number) {
  const today = startOfToday();
  const end = new Date(today);
  end.setDate(today.getDate() + days);
  const normalized = startOfDate(date);
  return normalized >= today && normalized <= end;
}

function formatRelativeDueDate(date: Date) {
  const today = startOfToday();
  const due = startOfDate(date);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (diff < 0) {
    return `${Math.abs(diff)}d overdue`;
  }

  if (diff === 0) {
    return "Due today";
  }

  if (diff === 1) {
    return "Due tomorrow";
  }

  return `Due in ${diff}d`;
}

function getCompletion(total: number, done: number) {
  if (!total) {
    return 0;
  }

  return Math.round((done / total) * 100);
}

function getPersonLabel(person: { name: string | null; email: string }) {
  return person.name || person.email;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [projects, activities, tasks] = await Promise.all([
    prisma.project.findMany({
      where: accessibleProjectWhere(user.id),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          select: {
            userId: true,
          },
        },
      },
    }),
    prisma.activity.findMany({
      where: { project: accessibleProjectWhere(user.id) },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.task.findMany({
      where: {
        project: accessibleProjectWhere(user.id),
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        updatedAt: true,
        projectId: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            title: true,
          },
        },
      },
    }),
  ]);

  const allTasks = tasks as DashboardTask[];
  const today = startOfToday();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const openTasks = allTasks.filter((task) => task.status !== "DONE").length;
  const dueSoonTasks = allTasks.filter((task) => {
    if (!task.dueDate || task.status === "DONE") {
      return false;
    }

    return isWithinNextDays(task.dueDate, 7);
  }).length;
  const overdueTasks = allTasks.filter((task) => {
    if (!task.dueDate || task.status === "DONE") {
      return false;
    }

    return startOfDate(task.dueDate) < today;
  }).length;
  const sharedProjects = projects.filter((project) => project.ownerId !== user.id).length;

  const tasksByProject = new Map<string, DashboardTask[]>();
  for (const task of allTasks) {
    const projectTasks = tasksByProject.get(task.projectId) ?? [];
    projectTasks.push(task);
    tasksByProject.set(task.projectId, projectTasks);
  }

  const upcomingTasks = allTasks
    .filter((task) => {
      if (!task.dueDate || task.status === "DONE") {
        return false;
      }

      return startOfDate(task.dueDate) < today || isWithinNextDays(task.dueDate, 7);
    })
    .sort((left, right) => {
      if (!left.dueDate || !right.dueDate) {
        return 0;
      }

      return left.dueDate.getTime() - right.dueDate.getTime();
    })
    .slice(0, 6);

  return (
    <AppShell
      title="Dashboard"
      navItems={[
        { href: "/dashboard", label: "Dashboard", icon: "dashboard", active: true },
        { href: "#projects", label: "Projects", icon: "folder", badge: String(projects.length) },
        { href: "#deadlines", label: "Deadlines", icon: "reports", badge: String(upcomingTasks.length) },
        { href: "#activity", label: "Activity", icon: "activity" },
      ]}
      userName={user.name || user.email}
      userEmail={user.email}
      userAction={<LogoutButton />}
      topbarRight={
        <>
          <div className="hidden h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/30 md:flex">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M8 8l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Search...
            <span className="ml-1 rounded border border-white/10 px-1 text-[10px]">/</span>
          </div>
          <NewProjectForm />
        </>
      }
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
              Open tasks
            </p>
            <p className="mt-2 text-3xl font-semibold text-white/90">{openTasks}</p>
            <p className="text-sm text-white/35">Across every workspace you can access</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
              Due this week
            </p>
            <p className="mt-2 text-3xl font-semibold text-white/90">{dueSoonTasks}</p>
            <p className="text-sm text-white/35">Tasks landing in the next 7 days</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
              Needs attention
            </p>
            <p className="mt-2 text-3xl font-semibold text-white/90">{overdueTasks}</p>
            <p className="text-sm text-white/35">Overdue tasks still in motion</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
              Shared workspaces
            </p>
            <p className="mt-2 text-3xl font-semibold text-white/90">{sharedProjects}</p>
            <p className="text-sm text-white/35">Projects you collaborate on as a member</p>
          </div>
        </section>

        <section
          id="projects"
          className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#1a1d27]"
        >
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/30">
              Projects
            </h2>
            <span className="text-xs text-white/25">{projects.length} total</span>
          </div>

          <div className="grid grid-cols-[1fr_160px_120px] border-b border-white/[0.05] px-5 py-2.5">
            <span className="text-[11px] text-white/25">Name</span>
            <span className="text-[11px] text-white/25">Created</span>
            <span className="text-[11px] text-right text-white/25">Actions</span>
          </div>

          {projects.length ? (
            projects.map((project) => {
              const projectTasks = tasksByProject.get(project.id) ?? [];
              const totalProjectTasks = projectTasks.length;
              const doneProjectTasks = projectTasks.filter((task) => task.status === "DONE").length;
              const activeProjectTasks = projectTasks.filter((task) => task.status !== "DONE").length;
              const dueSoonProjectTasks = projectTasks.filter((task) => {
                if (!task.dueDate || task.status === "DONE") {
                  return false;
                }

                return isWithinNextDays(task.dueDate, 7);
              }).length;
              const progress = getCompletion(totalProjectTasks, doneProjectTasks);
              const memberCount = new Set([project.ownerId, ...project.members.map((member) => member.userId)]).size;
              const isOwner = project.ownerId === user.id;

              return (
                <div
                  key={project.id}
                  className="grid grid-cols-[1fr_160px_120px] items-center border-b border-white/[0.04] px-5 py-3.5 transition hover:bg-white/[0.02] last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-400">
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M1.5 4C1.5 3.17 2.17 2.5 3 2.5h2.5L7 4h3c.83 0 1.5.67 1.5 1.5v4c0 .83-.67 1.5-1.5 1.5H3c-.83 0-1.5-.67-1.5-1.5V4Z" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/80">
                        {project.title}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-white/30">
                        <span className="rounded-full border border-white/10 px-2 py-1">
                          {isOwner ? "Owner" : `Shared by ${getPersonLabel(project.owner)}`}
                        </span>
                        <span>{memberCount} teammates</span>
                      </div>
                      {project.description ? (
                        <p className="mt-2 truncate text-xs text-white/30">
                          {project.description}
                        </p>
                      ) : null}
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-white/30">{progress}%</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/30">
                        <span>{doneProjectTasks}/{totalProjectTasks} done</span>
                        <span>{activeProjectTasks} active</span>
                        <span>{dueSoonProjectTasks} due soon</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-xs text-white/30">
                    {formatProjectDate(project.createdAt)}
                  </span>

                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex h-7 items-center rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/50 transition hover:border-white/20 hover:text-white"
                    >
                      Open
                    </Link>
                    {isOwner ? (
                      <DeleteProjectButton
                        projectId={project.id}
                        projectTitle={project.title}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-5 py-12 text-center text-sm text-white/25">
              No projects yet. Create one or join a shared workspace to get started.
            </div>
          )}
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <section
            id="deadlines"
            className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#1a1d27]"
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white/30">
                Upcoming deadlines
              </h2>
              <span className="text-xs text-white/25">Next 7 days + overdue</span>
            </div>

            {upcomingTasks.length ? (
              <div className="divide-y divide-white/[0.04]">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white/80">
                        {task.title}
                      </p>
                      <p className="mt-1 text-xs text-white/30">
                        {task.project.title} · {task.priority.toLowerCase()} priority
                        {task.assignee ? ` · ${getPersonLabel(task.assignee)}` : " · unassigned"}
                      </p>
                    </div>
                    {task.dueDate ? (
                      <div className="text-right">
                        <p className="text-sm text-white/75">{formatDueDate(task.dueDate)}</p>
                        <p
                          className={`text-xs ${
                            startOfDate(task.dueDate) < today ? "text-red-300" : "text-amber-300"
                          }`}
                        >
                          {formatRelativeDueDate(task.dueDate)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-12 text-center text-sm text-white/25">
                Nothing urgent right now. Due dates for the next week will show up here.
              </div>
            )}
          </section>

          <section
            id="activity"
            className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#1a1d27]"
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white/30">
                Activity
              </h2>
              <span className="text-xs text-white/25">Latest updates</span>
            </div>

            <div className="grid grid-cols-[1fr_180px] border-b border-white/[0.05] px-5 py-2.5">
              <span className="text-[11px] text-white/25">Event</span>
              <span className="text-[11px] text-white/25">Time</span>
            </div>

            {activities.length ? (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="grid grid-cols-[1fr_180px] items-center gap-4 border-b border-white/[0.04] px-5 py-3.5 transition hover:bg-white/[0.02] last:border-0"
                >
                  <p className="text-sm text-white/50">
                    <span className="font-medium text-white/75">
                      {activity.user.name || activity.user.email}
                    </span>{" "}
                    {activity.message}
                  </p>
                  <span className="text-xs text-white/25">
                    {formatActivityDate(activity.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-5 py-12 text-center text-sm text-white/25">
                No activity yet. Create or update a task to see updates here.
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
