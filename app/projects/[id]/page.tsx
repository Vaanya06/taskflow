import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accessibleProjectWhere } from "@/project-access";
import LogoutButton from "@/app/dashboard/logout-button";
import AddMemberForm from "./add-member-form";
import AddSprintForm from "./add-sprint-form";
import TaskBoard from "./task-board";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type WorkspaceMember = {
  id: string;
  name: string | null;
  email: string;
  role: "OWNER" | "MEMBER";
};

type IssueType = "EPIC" | "STORY" | "TASK" | "BUG";

const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  EPIC: "Epic",
  STORY: "Story",
  TASK: "Task",
  BUG: "Bug",
};

const PRIORITY_WEIGHT = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
} as const;

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

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatSprintWindow(startDate: Date | null, endDate: Date | null) {
  if (startDate && endDate) {
    return `${formatDueDate(startDate)} / ${formatDueDate(endDate)}`;
  }

  if (startDate) {
    return `Starts ${formatDueDate(startDate)}`;
  }

  if (endDate) {
    return `Ends ${formatDueDate(endDate)}`;
  }

  return "Schedule anytime";
}

function getPersonLabel(person: { name: string | null; email: string }) {
  return person.name || person.email;
}

function getInitials(person: { name: string | null; email: string }) {
  return getPersonLabel(person).slice(0, 2).toUpperCase();
}

function getCompletion(total: number, done: number) {
  if (!total) {
    return 0;
  }

  return (done / total) * 100;
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
      ...accessibleProjectWhere(user.id),
    },
    select: {
      id: true,
      title: true,
      description: true,
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
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      sprints: {
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          goal: true,
          startDate: true,
          endDate: true,
          isActive: true,
          createdAt: true,
        },
      },
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
        issueType: true,
        status: true,
        priority: true,
        storyPoints: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sprint: {
          select: {
            id: true,
            title: true,
            isActive: true,
          },
        },
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

  const teamMemberMap = new Map<string, WorkspaceMember>();
  teamMemberMap.set(project.owner.id, {
    id: project.owner.id,
    name: project.owner.name,
    email: project.owner.email,
    role: "OWNER",
  });

  for (const membership of project.members) {
    if (!teamMemberMap.has(membership.user.id)) {
      teamMemberMap.set(membership.user.id, {
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
      });
    }
  }

  const teamMembers = Array.from(teamMemberMap.values()).sort((left, right) => {
    if (left.role !== right.role) {
      return left.role === "OWNER" ? -1 : 1;
    }

    return getPersonLabel(left).localeCompare(getPersonLabel(right));
  });

  const sprintOptions = project.sprints.map((sprint) => ({
    id: sprint.id,
    title: sprint.title,
    isActive: sprint.isActive,
  }));

  const normalizedTasks = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    issueType: task.issueType,
    status: task.status,
    priority: task.priority,
    storyPoints: task.storyPoints,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    assignee: task.assignee,
    sprint: task.sprint,
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
  const assignedToMe = tasks.filter(
    (task) => task.assignee?.id === user.id && task.status !== "DONE",
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
  const backlogTasks = tasks.filter((task) => !task.sprint);
  const backlogOpenTasks = backlogTasks.filter((task) => task.status !== "DONE");
  const backlogPoints = backlogOpenTasks.reduce((sum, task) => sum + (task.storyPoints ?? 0), 0);
  const activeSprint = project.sprints.find((sprint) => sprint.isActive) ?? null;
  const activeSprintTasks = activeSprint
    ? tasks.filter((task) => task.sprint?.id === activeSprint.id)
    : [];
  const activeSprintDone = activeSprintTasks.filter((task) => task.status === "DONE").length;
  const activeSprintOpen = activeSprintTasks.filter((task) => task.status !== "DONE").length;
  const activeSprintPoints = activeSprintTasks.reduce(
    (sum, task) => sum + (task.storyPoints ?? 0),
    0,
  );
  const projectProgress = getCompletion(totalTasks, doneTasks);
  const activeSprintProgress = getCompletion(activeSprintTasks.length, activeSprintDone);
  const isProjectOwner = project.ownerId === user.id;

  const assignmentsByMember = new Map<string, { total: number; open: number }>();
  for (const task of tasks) {
    if (!task.assignee) {
      continue;
    }

    const current = assignmentsByMember.get(task.assignee.id) ?? { total: 0, open: 0 };
    current.total += 1;
    if (task.status !== "DONE") {
      current.open += 1;
    }
    assignmentsByMember.set(task.assignee.id, current);
  }

  const backlogPreview = backlogOpenTasks
    .slice()
    .sort((left, right) => {
      const priorityDifference = PRIORITY_WEIGHT[left.priority] - PRIORITY_WEIGHT[right.priority];
      if (priorityDifference !== 0) {
        return priorityDifference;
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

  const sprintSummaries = project.sprints.map((sprint) => {
    const sprintTasks = tasks.filter((task) => task.sprint?.id === sprint.id);
    const sprintPoints = sprintTasks.reduce((sum, task) => sum + (task.storyPoints ?? 0), 0);
    const sprintDone = sprintTasks.filter((task) => task.status === "DONE").length;

    return {
      ...sprint,
      issueCount: sprintTasks.length,
      pointCount: sprintPoints,
      progress: getCompletion(sprintTasks.length, sprintDone),
    };
  });

  return (
    <AppShell
      title="Project Workspace"
      navItems={[
        { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
        { href: "#overview", label: "Overview", icon: "folder" },
        {
          href: "#planning",
          label: "Planning",
          icon: "reports",
          badge: String(activeSprintTasks.length || backlogOpenTasks.length),
        },
        { href: "#board", label: "Board", icon: "board", badge: String(tasks.length), active: true },
        { href: "#team", label: "Team", icon: "team", badge: String(teamMembers.length) },
        { href: "#activity", label: "Activity", icon: "activity" },
      ]}
      userName={user.name || user.email}
      userEmail={user.email}
      userAction={<LogoutButton />}
      topbarRight={
        <>
          <div className="hidden h-8 items-center rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/35 md:flex">
            {activeSprint ? activeSprint.title : "No active sprint"}
          </div>
          <div className="hidden h-8 items-center rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/35 xl:flex">
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
                  Plan the backlog, run sprints, and keep shared ownership visible in one place.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-white/40">
              <span className="rounded-full border border-white/10 px-3 py-2">{totalTasks} issues</span>
              <span className="rounded-full border border-white/10 px-3 py-2">{backlogOpenTasks.length} backlog</span>
              <span className="rounded-full border border-white/10 px-3 py-2">{project.sprints.length} sprints</span>
              <span className="rounded-full border border-white/10 px-3 py-2">{teamMembers.length} teammates</span>
            </div>
          </div>
        </header>

        <section id="planning" className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
                Project progress
              </p>
              <p className="mt-2 text-3xl font-semibold text-white/90">{formatPercent(projectProgress)}</p>
              <p className="text-sm text-white/35">{doneTasks} of {totalTasks} issues completed</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
                Active sprint scope
              </p>
              <p className="mt-2 text-3xl font-semibold text-white/90">{activeSprintTasks.length}</p>
              <p className="text-sm text-white/35">{activeSprint ? `${activeSprintOpen} open / ${activeSprintPoints} points` : "Start a sprint to focus the team"}</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
                Backlog ready
              </p>
              <p className="mt-2 text-3xl font-semibold text-white/90">{backlogOpenTasks.length}</p>
              <p className="text-sm text-white/35">{backlogPoints} points waiting to be planned</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
                Assigned to me
              </p>
              <p className="mt-2 text-3xl font-semibold text-white/90">{assignedToMe}</p>
              <p className="text-sm text-white/35">{inProgressTasks} issues currently in motion</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
            <div className="border-b border-white/[0.07] pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
                    Sprint control
                  </p>
                  <p className="mt-1 text-sm text-white/35">
                    Set the active sprint and shape what the board should optimize for.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/35">
                  {activeSprint ? "Active sprint live" : "Backlog mode"}
                </span>
              </div>
            </div>

            {activeSprint ? (
              <div className="mt-4 rounded-xl border border-white/[0.07] bg-[#13161f] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white/85">{activeSprint.title}</p>
                    <p className="mt-1 text-xs text-white/35">
                      {formatSprintWindow(activeSprint.startDate, activeSprint.endDate)}
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                    Active
                  </span>
                </div>
                {activeSprint.goal ? (
                  <p className="mt-3 text-sm leading-6 text-white/45">{activeSprint.goal}</p>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-white/28">No sprint goal yet.</p>
                )}
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/25">Progress</p>
                    <p className="mt-2 text-lg font-semibold text-white/85">{formatPercent(activeSprintProgress)}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/25">Open issues</p>
                    <p className="mt-2 text-lg font-semibold text-white/85">{activeSprintOpen}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/25">Points</p>
                    <p className="mt-2 text-lg font-semibold text-white/85">{activeSprintPoints}</p>
                  </div>
                </div>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all"
                    style={{ width: `${Math.min(activeSprintProgress, 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-white/[0.08] bg-[#13161f] p-5 text-sm text-white/30">
                Nothing is active yet. Keep using the backlog, or create a sprint to define the team&apos;s current scope.
              </div>
            )}

            <div className="mt-4 border-t border-white/[0.07] pt-4">
              {isProjectOwner ? (
                <AddSprintForm projectId={project.id} />
              ) : (
                <div className="rounded-xl border border-dashed border-white/[0.08] bg-[#13161f] p-5 text-sm text-white/30">
                  {getPersonLabel(project.owner)} manages sprint cadence for this project.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#1a1d27]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-white/30">
                  Backlog candidates
                </h2>
                <p className="mt-1 text-sm text-white/35">
                  The strongest items to pull into the next sprint.
                </p>
              </div>
              <span className="text-xs text-white/25">{backlogOpenTasks.length} open</span>
            </div>

            {backlogPreview.length ? (
              <div className="divide-y divide-white/[0.04]">
                {backlogPreview.map((task) => (
                  <div key={task.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-200">
                            {ISSUE_TYPE_LABELS[task.issueType]}
                          </span>
                          <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/40">
                            {task.priority.toLowerCase()} priority
                          </span>
                          {task.storyPoints ? (
                            <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/40">
                              {task.storyPoints} pts
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 truncate text-sm font-semibold text-white/85">
                          {task.title}
                        </p>
                        <p className="mt-1 text-xs text-white/35">
                          {task.assignee ? `Assigned to ${getPersonLabel(task.assignee)}` : "Unassigned"}
                          {task.labels.length ? ` / ${task.labels.length} labels` : " / No labels"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-white/30">
                        {task.dueDate ? formatDueDate(task.dueDate) : "No due date"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-12 text-center text-sm text-white/25">
                No open backlog items right now. New issues without a sprint will show up here.
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#1a1d27]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-white/30">
                  Sprint cadence
                </h2>
                <p className="mt-1 text-sm text-white/35">
                  Every sprint in this workspace with scope and progress.
                </p>
              </div>
              <span className="text-xs text-white/25">{project.sprints.length} total</span>
            </div>

            {sprintSummaries.length ? (
              <div className="divide-y divide-white/[0.04]">
                {sprintSummaries.map((sprint) => (
                  <div key={sprint.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white/82">{sprint.title}</p>
                          {sprint.isActive ? (
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300">
                              Active
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-white/35">
                          {formatSprintWindow(sprint.startDate, sprint.endDate)}
                        </p>
                        <p className="mt-2 text-xs text-white/30">
                          {sprint.goal || "No sprint goal yet."}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-white/35">
                        <p>{sprint.issueCount} issues</p>
                        <p>{sprint.pointCount} points</p>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${Math.min(sprint.progress, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-12 text-center text-sm text-white/25">
                No sprints yet. Create the first one to start running iterations here.
              </div>
            )}
          </div>
        </section>

        <TaskBoard
          projectId={project.id}
          tasks={normalizedTasks}
          members={teamMembers}
          sprints={sprintOptions}
          currentUserId={user.id}
          canDeleteTasks={isProjectOwner}
        />

        <section id="team" className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#1a1d27]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white/30">
                Team
              </h2>
              <span className="text-xs text-white/25">{teamMembers.length} people</span>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {teamMembers.map((member) => {
                const assignmentStats = assignmentsByMember.get(member.id) ?? { total: 0, open: 0 };
                return (
                  <div key={member.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-semibold text-indigo-200">
                        {getInitials(member)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white/80">
                          {getPersonLabel(member)}
                        </p>
                        <p className="truncate text-xs text-white/30">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-white/35">
                      <span className="rounded-full border border-white/10 px-2.5 py-1">
                        {member.role === "OWNER" ? "Owner" : "Member"}
                      </span>
                      <span>{assignmentStats.open} open</span>
                      <span>{assignmentStats.total} total assigned</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
            <div className="border-b border-white/[0.07] pb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
                Collaboration
              </p>
              <p className="mt-1 text-sm text-white/35">
                Keep membership, ownership, and sprint planning close to the work.
              </p>
            </div>

            {isProjectOwner ? (
              <div className="mt-4">
                <AddMemberForm projectId={project.id} />
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-white/[0.08] bg-[#13161f] p-5 text-sm text-white/30">
                {getPersonLabel(project.owner)} manages membership for this project.
              </div>
            )}

            <div className="mt-4 rounded-xl border border-white/[0.07] bg-[#13161f] p-4 text-sm text-white/35">
              Assignees, story points, issue types, and sprint placement are all available directly in the board so planning stays lightweight.
            </div>
            <div className="mt-4 rounded-xl border border-white/[0.07] bg-[#13161f] p-4 text-sm text-white/35">
              {overdueTasks} overdue and {dueSoonTasks} due soon. Use the filters below to isolate risk before it blocks the sprint.
            </div>
          </div>
        </section>

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
              No activity yet. Create issues, comments, or sprints to build the timeline.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}