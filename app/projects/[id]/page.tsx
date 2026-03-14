import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/app/dashboard/logout-button";
import TaskBoard from "./task-board";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

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

function formatDueDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatActivityDate(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getFocusLabel(task: {
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: Date | null;
}) {
  const today = startOfToday();

  if (task.dueDate && startOfDate(task.dueDate) < today && task.status !== "DONE") {
    return "Overdue";
  }

  if (task.dueDate && isWithinNextDays(task.dueDate, 7) && task.status !== "DONE") {
    return "Due soon";
  }

  if (task.priority === "HIGH" && task.status !== "DONE") {
    return "High priority";
  }

  return "Active";
}

export default async function ProjectPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const projectId = (await params).id;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: user.id,
    },
  });

  if (!project) {
    notFound();
  }

  const [tasks, activities] = await Promise.all([
    prisma.task.findMany({
      where: {
        projectId: project.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        labels: {
          select: {
            label: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        comments: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    }),
    prisma.activity.findMany({
      where: {
        projectId: project.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const normalizedTasks = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    labels: task.labels.map((item) => item.label),
    comments: task.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: comment.user.name || comment.user.email,
    })),
  }));

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((task) => task.status === "DONE").length;
  const inProgressTasks = tasks.filter((task) => task.status === "IN_PROGRESS").length;
  const highPriorityTasks = tasks.filter(
    (task) => task.status !== "DONE" && task.priority === "HIGH",
  ).length;
  const today = startOfToday();
  const overdueTasks = tasks.filter((task) => {
    if (!task.dueDate || task.status === "DONE") {
      return false;
    }

    return startOfDate(task.dueDate) < today;
  }).length;
  const dueSoonTasks = tasks.filter((task) => {
    if (!task.dueDate || task.status === "DONE") {
      return false;
    }

    return isWithinNextDays(task.dueDate, 7);
  }).length;

  const focusTasks = tasks
    .filter((task) => task.status !== "DONE")
    .sort((left, right) => {
      const leftLabel = getFocusLabel(left);
      const rightLabel = getFocusLabel(right);
      const labelWeight = {
        Overdue: 0,
        "Due soon": 1,
        "High priority": 2,
        Active: 3,
      } as const;
      const weightDifference = labelWeight[leftLabel] - labelWeight[rightLabel];
      if (weightDifference !== 0) {
        return weightDifference;
      }

      if (left.dueDate && right.dueDate) {
        const dueDifference = left.dueDate.getTime() - right.dueDate.getTime();
        if (dueDifference !== 0) {
          return dueDifference;
        }
      }

      if (left.dueDate) {
        return -1;
      }

      if (right.dueDate) {
        return 1;
      }

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    })
    .slice(0, 5);

  return (
    <AppShell
      title="Project Workspace"
      navItems={[
        { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
        { href: "#overview", label: "Overview", icon: "folder" },
        { href: "#focus", label: "Focus", icon: "reports", badge: String(focusTasks.length) },
        { href: "#board", label: "Board", icon: "board", badge: String(tasks.length), active: true },
        { href: "#activity", label: "Activity", icon: "activity" },
      ]}
      userName={user.name || user.email}
      userEmail={user.email}
      userAction={<LogoutButton />}
      topbarRight={
        <>
          <div className="hidden h-8 items-center rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/35 md:flex">
            {dueSoonTasks} due soon
          </div>
          <Link
            href="/dashboard"
            className="flex h-8 items-center rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/50 transition hover:border-white/20 hover:text-white"
          >
            Back to dashboard
          </Link>
        </>
      }
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header
          id="overview"
          className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-6"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-white/30">
            Project Workspace
          </p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white/90">
                {project.title}
              </h1>
              {project.description ? (
                <p className="mt-2 max-w-2xl text-sm leading-7 text-white/40">
                  {project.description}
                </p>
              ) : (
                <p className="mt-2 max-w-2xl text-sm leading-7 text-white/30">
                  Keep this workspace focused with tasks, comments, and status updates.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-white/40">
              <span className="rounded-full border border-white/10 px-3 py-2">{totalTasks} tasks</span>
              <span className="rounded-full border border-white/10 px-3 py-2">{overdueTasks} overdue</span>
              <span className="rounded-full border border-white/10 px-3 py-2">{dueSoonTasks} due soon</span>
            </div>
          </div>
        </header>

        <section id="focus" className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
                Total tasks
              </p>
              <p className="mt-2 text-3xl font-semibold text-white/90">{totalTasks}</p>
              <p className="text-sm text-white/35">All work in this project</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
                In progress
              </p>
              <p className="mt-2 text-3xl font-semibold text-white/90">{inProgressTasks}</p>
              <p className="text-sm text-white/35">Active work in motion</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
                Completed
              </p>
              <p className="mt-2 text-3xl font-semibold text-white/90">{doneTasks}</p>
              <p className="text-sm text-white/35">Tasks already finished</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
                High priority
              </p>
              <p className="mt-2 text-3xl font-semibold text-white/90">{highPriorityTasks}</p>
              <p className="text-sm text-white/35">Open tasks flagged as important</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
                  Focus queue
                </p>
                <p className="mt-1 text-sm text-white/35">
                  The tasks that deserve attention first.
                </p>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/35">
                {focusTasks.length} items
              </span>
            </div>

            {focusTasks.length ? (
              <div className="mt-4 flex flex-col gap-3">
                {focusTasks.map((task) => {
                  const focusLabel = getFocusLabel(task);
                  return (
                    <div
                      key={task.id}
                      className="rounded-xl border border-white/[0.07] bg-[#13161f] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white/85">
                            {task.title}
                          </p>
                          <p className="mt-1 text-xs text-white/35">
                            {task.priority.toLowerCase()} priority · {task.status.replace("_", " ").toLowerCase()}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            focusLabel === "Overdue"
                              ? "bg-red-500/10 text-red-300"
                              : focusLabel === "Due soon"
                                ? "bg-amber-500/10 text-amber-300"
                                : focusLabel === "High priority"
                                  ? "bg-indigo-500/10 text-indigo-300"
                                  : "bg-white/5 text-white/45"
                          }`}
                        >
                          {focusLabel}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-white/35">
                        <span>{task.comments.length} comments · {task.labels.length} labels</span>
                        <span>
                          {task.dueDate ? formatDueDate(task.dueDate) : "No due date"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-white/[0.08] bg-[#13161f] p-6 text-sm text-white/25">
                Nothing urgent right now. New open tasks will surface here automatically.
              </div>
            )}
          </div>
        </section>

        <TaskBoard projectId={project.id} tasks={normalizedTasks} />

        <section
          id="activity"
          className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#1a1d27]"
        >
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/30">
              Project activity
            </h2>
            <span className="text-xs text-white/25">Latest 8 events</span>
          </div>

          {activities.length ? (
            <div className="divide-y divide-white/[0.04]">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <p className="text-sm text-white/50">
                    <span className="font-medium text-white/75">
                      {activity.user.name || activity.user.email}
                    </span>{" "}
                    {activity.message}
                  </p>
                  <span className="shrink-0 text-xs text-white/25">
                    {formatActivityDate(activity.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center text-sm text-white/25">
              No activity yet. Create tasks or add comments to build the timeline.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
