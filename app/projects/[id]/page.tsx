import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/workspace-shell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accessibleProjectWhere, accessibleTaskWhere } from "@/project-access";
import {
  canManageProject as hasProjectManagementAccess,
  canManageProjectTasks as hasTaskManagementAccess,
} from "@/lib/project-task-permissions";
import LogoutButton from "@/app/dashboard/logout-button";
import AddMemberForm from "./add-member-form";
import AddSprintForm from "./add-sprint-form";
import TaskBoard from "./task-board";
import ProjectTeamControl from "./project-team-control";
import ProjectMembershipControls from "./project-membership-controls";
import CompleteSprintButton from "./complete-sprint-button";
import SprintBurndownChart from "./sprint-burndown-chart";
import TeamWorkload from "./team-workload";
import { recordActiveSprintProgress } from "@/services/sprint-progress";
import { getDemoProjectId } from "@/services/demo-project";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    tab?: string;
    taskId?: string;
  }>;
};

type WorkspaceMember = {
  id: string;
  name: string | null;
  email: string;
  role: "OWNER" | "MEMBER";
  accessRole: "OWNER" | "PROJECT MEMBER" | "TEAM MANAGER" | "TEAM MEMBER";
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

export default async function ProjectPage({ params, searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const projectId = (await params).id;
  const query = await searchParams;
  const activeTab = query?.tab ?? "board";
  const requestedTaskId = query?.taskId ?? null;
  const tabValues = ["overview", "planning", "board", "team", "activity"] as const;
  const normalizedTab = tabValues.includes(activeTab as (typeof tabValues)[number])
    ? (activeTab as (typeof tabValues)[number])
    : "board";

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
      team: {
        select: {
          id: true,
          name: true,
          memberships: {
            include: {
              user: { select: { id: true, name: true, email: true } },
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

  const managedTeams = user.role === "MANAGER"
    ? await prisma.team.findMany({
        where: { memberships: { some: { userId: user.id, role: "MANAGER" } } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const projectPermissions = {
    ownerId: project.ownerId,
    members: project.members.map((member) => ({ userId: member.user.id })),
    team: project.team
      ? {
          memberships: project.team.memberships.map((membership) => ({
            userId: membership.userId,
            role: membership.role,
          })),
        }
      : null,
  };
  const canManageProject = hasProjectManagementAccess(projectPermissions, user.id);
  const canManageProjectTasks = hasTaskManagementAccess(projectPermissions, user.id);

  if (normalizedTab === "planning") {
    await recordActiveSprintProgress(project.id);
  }
  const sprintHistory = normalizedTab === "planning"
    ? await prisma.sprint.findMany({
        where: { projectId: project.id },
        orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          completedAt: true,
          isActive: true,
          scopeTasks: true,
          scopePoints: true,
          completedTasks: true,
          carriedOverTasks: true,
          completedPoints: true,
          carriedOverPoints: true,
          snapshots: {
            orderBy: { snapshotDate: "asc" },
            select: {
              snapshotDate: true,
              scopeTasks: true,
              remainingTasks: true,
            },
          },
        },
      })
    : [];

  const [tasks, activities] = await Promise.all([
    prisma.task.findMany({
      where: {
        AND: [
          { projectId: project.id },
          accessibleTaskWhere(user.id),
        ],
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
        OR: [
          { taskId: null },
          { task: { is: accessibleTaskWhere(user.id) } },
        ],
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
    accessRole: "OWNER",
  });

  for (const membership of project.members) {
    if (!teamMemberMap.has(membership.user.id)) {
      teamMemberMap.set(membership.user.id, {
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
        accessRole: "PROJECT MEMBER",
      });
    }
  }

  for (const membership of project.team?.memberships ?? []) {
    const existing = teamMemberMap.get(membership.user.id);
    if (membership.role === "MANAGER" && existing && existing.role !== "OWNER") {
      existing.accessRole = "TEAM MANAGER";
    } else if (!existing) {
      teamMemberMap.set(membership.user.id, {
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        role: "MEMBER",
        accessRole: membership.role === "MANAGER" ? "TEAM MANAGER" : "TEAM MEMBER",
      });
    }
  }

  const teamMembers = Array.from(teamMemberMap.values()).sort((left, right) => {
    if (left.accessRole !== right.accessRole) {
      const order = ["OWNER", "TEAM MANAGER", "PROJECT MEMBER", "TEAM MEMBER"];
      return order.indexOf(left.accessRole) - order.indexOf(right.accessRole);
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
  const activeSprintHistory = sprintHistory.find((sprint) => sprint.id === activeSprint?.id);
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

  const renderTabContent = () => {
    switch (normalizedTab) {
      case "overview":
        return (
          <header id="overview" className="rounded-xl border border-white/[0.07] bg-white p-6">
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
                <p className="mt-3 text-xs text-slate-500">
                  Shared project issues are managed here; personal to-dos stay separate.
                </p>
                {project.team ? (
                  <p className="mt-2 text-sm font-medium text-indigo-700">Team: {project.team.name}</p>
                ) : null}
                <ProjectTeamControl
                  projectId={project.id}
                  currentTeamId={project.team?.id ?? null}
                  teams={managedTeams}
                  canManage={canManageProject}
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-white/40">
                <span className="rounded-full border border-white/10 px-3 py-2">{totalTasks} issues</span>
                <span className="rounded-full border border-white/10 px-3 py-2">{backlogOpenTasks.length} backlog</span>
                <span className="rounded-full border border-white/10 px-3 py-2">{project.sprints.length} sprints</span>
                <span className="rounded-full border border-white/10 px-3 py-2">{teamMembers.length} teammates</span>
              </div>
            </div>
          </header>
        );
      case "planning":
        return (
          <section id="planning" className="grid gap-5">
            <div className="grid gap-4 xl:grid-cols-4">
              <div className="rounded-xl border border-white/[0.07] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">Project progress</p>
                <p className="mt-2 text-3xl font-semibold text-white/90">{formatPercent(projectProgress)}</p>
                <p className="text-sm text-white/35">{doneTasks} of {totalTasks} issues completed</p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">Active sprint scope</p>
                <p className="mt-2 text-3xl font-semibold text-white/90">{activeSprintTasks.length}</p>
                <p className="text-sm text-white/35">{activeSprint ? `${activeSprintOpen} open / ${activeSprintPoints} points` : "Start a sprint to focus the team"}</p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">Backlog ready</p>
                <p className="mt-2 text-3xl font-semibold text-white/90">{backlogOpenTasks.length}</p>
                <p className="text-sm text-white/35">{backlogPoints} points waiting to be planned</p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">Assigned to me</p>
                <p className="mt-2 text-3xl font-semibold text-white/90">{assignedToMe}</p>
                <p className="text-sm text-white/35">{inProgressTasks} issues currently in motion</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-white p-5">
              <div className="border-b border-white/[0.07] pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">Sprint control</p>
                    <p className="mt-1 text-sm text-white/35">Set the active sprint and shape what the board should optimize for.</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/35">
                    {activeSprint ? "Active sprint live" : "Backlog mode"}
                  </span>
                </div>
              </div>

              {activeSprint ? (
                <div className="mt-4 rounded-xl border border-white/[0.07] bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white/85">{activeSprint.title}</p>
                      <p className="mt-1 text-xs text-white/35">{formatSprintWindow(activeSprint.startDate, activeSprint.endDate)}</p>
                    </div>
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                      Active
                    </span>
                  </div>
                  {canManageProject ? (
                    <div className="mt-3">
                      <CompleteSprintButton
                        projectId={project.id}
                        sprintId={activeSprint.id}
                        sprintTitle={activeSprint.title}
                      />
                    </div>
                  ) : null}
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
                    <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.min(activeSprintProgress, 100)}%` }} />
                  </div>
                  {canManageProjectTasks ? (
                    <SprintBurndownChart
                      startDate={activeSprintHistory?.startDate?.toISOString() ?? null}
                      endDate={activeSprintHistory?.endDate?.toISOString() ?? null}
                      completedAt={activeSprintHistory?.completedAt?.toISOString() ?? null}
                      isActive={activeSprint.isActive}
                      snapshots={(activeSprintHistory?.snapshots ?? []).map((snapshot) => ({
                        snapshotDate: snapshot.snapshotDate.toISOString().slice(0, 10),
                        scopeTasks: snapshot.scopeTasks,
                        remainingTasks: snapshot.remainingTasks,
                      }))}
                    />
                  ) : (
                    <p className="mt-4 text-xs text-white/35">Sprint burndown is available to project owners, team managers, and project members.</p>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-white/[0.08] bg-slate-50 p-5 text-sm text-white/30">
                  Nothing is active yet. Keep using the backlog, or create a sprint to define the team&apos;s current scope.
                </div>
              )}

              <div className="mt-4 border-t border-white/[0.07] pt-4">
                {canManageProject ? (
                  <AddSprintForm projectId={project.id} />
                ) : (
                  <div className="rounded-xl border border-dashed border-white/[0.08] bg-slate-50 p-5 text-sm text-white/30">
                    The project owner or connected team manager manages sprint cadence.
                  </div>
                )}
              </div>
            </div>

            <section className="rounded-xl border border-white/[0.07] bg-white p-5">
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] pb-3">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Sprint history</h2>
                  <p className="mt-1 text-sm text-white/40">Completed sprint outcomes and scope.</p>
                </div>
                <span className="text-xs text-white/30">{sprintHistory.filter((sprint) => sprint.completedAt).length} completed</span>
              </div>
              {sprintHistory.some((sprint) => sprint.completedAt) ? (
                <div className="mt-3 grid gap-3">
                  {sprintHistory.filter((sprint) => sprint.completedAt).map((sprint) => (
                    <article key={sprint.id} className="rounded-xl border border-white/[0.07] bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-white/80">{sprint.title}</h3>
                          <p className="mt-1 text-xs text-white/35">
                            Completed {sprint.completedAt?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        {canManageProjectTasks ? (
                          <span className="text-xs text-white/45">
                            {sprint.completedTasks ?? 0}/{sprint.scopeTasks ?? 0} issues done
                          </span>
                        ) : null}
                      </div>
                      {canManageProjectTasks ? (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45">
                          <span className="rounded-full border border-white/10 px-2.5 py-1">{sprint.completedPoints ?? 0}/{sprint.scopePoints ?? 0} points completed</span>
                          <span className="rounded-full border border-white/10 px-2.5 py-1">{sprint.carriedOverTasks ?? 0} issues moved to backlog</span>
                          <span className="rounded-full border border-white/10 px-2.5 py-1">{sprint.carriedOverPoints ?? 0} points moved</span>
                        </div>
                      ) : null}
                      {canManageProjectTasks ? (
                        <SprintBurndownChart
                          startDate={sprint.startDate?.toISOString() ?? null}
                          endDate={sprint.endDate?.toISOString() ?? null}
                          completedAt={sprint.completedAt?.toISOString() ?? null}
                          isActive={false}
                          snapshots={sprint.snapshots.map((snapshot) => ({
                            snapshotDate: snapshot.snapshotDate.toISOString().slice(0, 10),
                            scopeTasks: snapshot.scopeTasks,
                            remainingTasks: snapshot.remainingTasks,
                          }))}
                        />
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-white/35">Completed sprints will be recorded here after sprint completion.</p>
              )}
            </section>
          </section>
        );
      case "board":
        return (
          <TaskBoard
            projectId={project.id}
            tasks={normalizedTasks}
            members={teamMembers}
            sprints={sprintOptions}
            currentUserId={user.id}
            canDeleteTasks={canManageProject}
            canManageTasks={canManageProjectTasks}
            requestedTaskId={requestedTaskId}
          />
        );
      case "team":
        return (
          <section id="team" className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="xl:col-span-2">
              <TeamWorkload
                projectId={project.id}
                tasks={normalizedTasks}
                members={teamMembers}
                currentUserId={user.id}
                canViewAll={canManageProjectTasks}
              />
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white p-5 xl:col-span-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Access roles</h2>
              <div className="mt-4 grid gap-3 text-sm text-white/50 sm:grid-cols-2 xl:grid-cols-4">
                <p><span className="font-semibold text-white/80">Owner:</span> full project control.</p>
                <p><span className="font-semibold text-white/80">Team manager:</span> full control when the project is connected to their team.</p>
                <p><span className="font-semibold text-white/80">Project member:</span> view all issues, create and edit issues, and comment; cannot manage project settings or delete issues.</p>
                <p><span className="font-semibold text-white/80">Team member:</span> view assigned or unassigned issues, update their own issue status, and comment.</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-white/30">Team</h2>
                <span className="text-xs text-white/25">{teamMembers.length} people</span>
              </div>

              <div className="divide-y divide-white/[0.04]">
                {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-semibold text-indigo-200">
                          {getInitials(member)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white/80">{getPersonLabel(member)}</p>
                          <p className="truncate text-xs text-white/30">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-xs text-white/35">
                        <span className="rounded-full border border-white/10 px-2.5 py-1">
                          {member.accessRole}
                        </span>
                      </div>
                    </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-white p-5">
              <div className="border-b border-white/[0.07] pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/30">Collaboration</p>
                <p className="mt-1 text-sm text-white/35">Keep membership, ownership, and sprint planning close to the work.</p>
              </div>

              {canManageProject ? (
                <div className="mt-4">
                  <AddMemberForm projectId={project.id} />
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-white/[0.08] bg-slate-50 p-5 text-sm text-white/30">
                  The project owner or connected team manager manages membership.
                </div>
              )}
              <ProjectMembershipControls
                projectId={project.id}
                ownerId={project.ownerId}
                currentUserId={user.id}
                canManage={canManageProject}
                members={project.members.map((membership) => ({
                  id: membership.user.id,
                  name: membership.user.name,
                  email: membership.user.email,
                }))}
              />

              <div className="mt-4 rounded-xl border border-white/[0.07] bg-slate-50 p-4 text-sm text-white/35">
                Assignees, story points, issue types, and sprint placement are all available directly in the board so planning stays lightweight.
              </div>
              <div className="mt-4 rounded-xl border border-white/[0.07] bg-slate-50 p-4 text-sm text-white/35">
                {overdueTasks} overdue and {dueSoonTasks} due soon. Use the filters below to isolate risk before it blocks the sprint.
              </div>
            </div>
          </section>
        );
      case "activity":
        return (
          <section id="activity" className="overflow-hidden rounded-xl border border-white/[0.07] bg-white">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white/30">Project activity</h2>
              <span className="text-xs text-white/25">Latest 8 events</span>
            </div>

            {activities.length ? (
              <div className="divide-y divide-white/[0.04]">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <p className="text-sm text-white/50">
                      <span className="font-medium text-white/75">{activity.user.name || activity.user.email}</span>{" "}
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
        );
      default:
        return null;
    }
  };

  return (
    <WorkspaceShell
      title="Project Workspace"
      currentWorkspace="projects"
      navItems={[
        { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
        { href: `?tab=overview`, label: "Overview", icon: "folder", active: normalizedTab === "overview" },
        {
          href: `?tab=planning`,
          label: "Planning",
          icon: "reports",
          badge: String(activeSprintTasks.length || backlogOpenTasks.length),
          active: normalizedTab === "planning",
        },
        { href: `?tab=board`, label: "Board", icon: "board", badge: String(tasks.length), active: normalizedTab === "board" },
        { href: `?tab=team`, label: "Team", icon: "team", badge: String(teamMembers.length), active: normalizedTab === "team" },
        { href: `?tab=activity`, label: "Activity", icon: "activity", active: normalizedTab === "activity" },
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
            title={project.id === getDemoProjectId(user.id)
              ? "Return to the dashboard. Your feature demo will remain available."
              : undefined}
            className="flex h-8 items-center rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/50 transition hover:border-white/20 hover:text-white"
          >
            {project.id === getDemoProjectId(user.id) ? "Exit feature demo" : "Back to dashboard"}
          </Link>
        </>
      }
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        {renderTabContent()}
      </div>
    </WorkspaceShell>
  );
}