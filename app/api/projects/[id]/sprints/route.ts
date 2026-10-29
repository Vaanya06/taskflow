import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { accessibleProjectWhere } from "@/project-access";
import { canManageProject } from "@/lib/project-task-permissions";
import { recordActiveSprintProgress } from "@/services/sprint-progress";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type SprintPayload = {
  title?: string;
  goal?: string;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
};

function parseDate(value: unknown): Date | null | undefined {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = new Date(value.trim());
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json(
      { ok: false, error: "Project id is required." },
      { status: 400 },
    );
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...accessibleProjectWhere(user.id),
    },
    select: {
      id: true,
      ownerId: true,
      members: { select: { userId: true } },
      team: { select: { memberships: { select: { userId: true, role: true } } } },
    },
  });

  if (!project) {
    return NextResponse.json(
      { ok: false, error: "Project not found." },
      { status: 404 },
    );
  }

  if (!canManageProject(project, user.id)) {
    return NextResponse.json(
      { ok: false, error: "Only the project owner or connected team manager can manage sprints." },
      { status: 403 },
    );
  }

  let payload: SprintPayload | null = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const goal = typeof payload?.goal === "string" ? payload.goal.trim() : "";
  const startDate = parseDate(payload?.startDate ?? null);
  const endDate = parseDate(payload?.endDate ?? null);
  const isActive = payload?.isActive === true;

  if (title.length < 2) {
    return NextResponse.json(
      { ok: false, error: "Sprint name must be at least 2 characters." },
      { status: 400 },
    );
  }

  if (startDate === undefined || endDate === undefined) {
    return NextResponse.json(
      { ok: false, error: "Invalid sprint date." },
      { status: 400 },
    );
  }

  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    return NextResponse.json(
      { ok: false, error: "Sprint end date must be after the start date." },
      { status: 400 },
    );
  }

  if (isActive) {
    const activeSprint = await prisma.sprint.findFirst({
      where: { projectId, isActive: true },
      select: { title: true },
    });
    if (activeSprint) {
      return NextResponse.json(
        { ok: false, error: `Complete "${activeSprint.title}" before starting another sprint.` },
        { status: 409 },
      );
    }
  }

  const sprint = await prisma.$transaction(async (tx) => {
    const createdSprint = await tx.sprint.create({
      data: {
        title,
        goal: goal || null,
        startDate,
        endDate,
        isActive,
        projectId,
      },
      select: {
        id: true,
        title: true,
        goal: true,
        startDate: true,
        endDate: true,
        isActive: true,
        createdAt: true,
      },
    });
    await tx.activity.create({
      data: {
        type: "SPRINT_CREATED",
        message: `created sprint \"${createdSprint.title}\"`,
        userId: user.id,
        projectId,
      },
    });

    return createdSprint;
  });
  if (isActive) {
    await recordActiveSprintProgress(projectId, sprint.id);
  }

  return NextResponse.json(
    {
      ok: true,
      sprint: {
        id: sprint.id,
        title: sprint.title,
        goal: sprint.goal,
        startDate: sprint.startDate ? sprint.startDate.toISOString() : null,
        endDate: sprint.endDate ? sprint.endDate.toISOString() : null,
        isActive: sprint.isActive,
        createdAt: sprint.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id: projectId } = await params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...accessibleProjectWhere(user.id) },
    select: {
      id: true,
      ownerId: true,
      members: { select: { userId: true } },
      team: { select: { memberships: { select: { userId: true, role: true } } } },
    },
  });
  if (!project) {
    return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
  }
  if (!canManageProject(project, user.id)) {
    return NextResponse.json({ ok: false, error: "Only the project owner or connected team manager can manage sprints." }, { status: 403 });
  }

  let payload: { sprintId?: unknown; action?: unknown } | null = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const sprintId = typeof payload?.sprintId === "string" ? payload.sprintId.trim() : "";
  if (!sprintId || payload?.action !== "complete") {
    return NextResponse.json({ ok: false, error: "Choose an active sprint to complete." }, { status: 400 });
  }

  const summary = await prisma.$transaction(async (tx) => {
    const claimedSprint = await tx.sprint.updateMany({
      where: { id: sprintId, projectId, isActive: true, completedAt: null },
      data: { isActive: false },
    });
    if (claimedSprint.count === 0) {
      return null;
    }

    const [scope, completed, carried] = await Promise.all([
      tx.task.aggregate({
        where: { sprintId },
        _count: { _all: true },
        _sum: { storyPoints: true },
      }),
      tx.task.aggregate({
        where: { sprintId, status: "DONE" },
        _count: { _all: true },
        _sum: { storyPoints: true },
      }),
      tx.task.aggregate({
        where: { sprintId, status: { not: "DONE" } },
        _count: { _all: true },
        _sum: { storyPoints: true },
      }),
    ]);
    const completedAt = new Date();
    const snapshotDate = new Date(Date.UTC(
      completedAt.getUTCFullYear(),
      completedAt.getUTCMonth(),
      completedAt.getUTCDate(),
    ));
    await tx.sprintProgressSnapshot.upsert({
      where: {
        sprintId_snapshotDate: {
          sprintId,
          snapshotDate,
        },
      },
      create: {
        sprintId,
        snapshotDate,
        scopeTasks: scope._count._all,
        scopePoints: scope._sum.storyPoints ?? 0,
        remainingTasks: carried._count._all,
        remainingPoints: carried._sum.storyPoints ?? 0,
      },
      update: {
        scopeTasks: scope._count._all,
        scopePoints: scope._sum.storyPoints ?? 0,
        remainingTasks: carried._count._all,
        remainingPoints: carried._sum.storyPoints ?? 0,
      },
    });

    await tx.task.updateMany({
      where: { sprintId, status: { not: "DONE" } },
      data: { sprintId: null },
    });
    const completedSprint = await tx.sprint.update({
      where: { id: sprintId },
      data: {
        completedAt,
        scopeTasks: scope._count._all,
        scopePoints: scope._sum.storyPoints ?? 0,
        completedTasks: completed._count._all,
        carriedOverTasks: carried._count._all,
        completedPoints: completed._sum.storyPoints ?? 0,
        carriedOverPoints: carried._sum.storyPoints ?? 0,
      },
      select: { id: true, title: true, completedAt: true },
    });
    await tx.activity.create({
      data: {
        type: "SPRINT_COMPLETED",
        message: `completed sprint "${completedSprint.title}" and moved ${carried._count._all} unfinished issues to the backlog`,
        userId: user.id,
        projectId,
      },
    });
    return {
      sprint: completedSprint,
      scopeTasks: scope._count._all,
      scopePoints: scope._sum.storyPoints ?? 0,
      completedTasks: completed._count._all,
      carriedOverTasks: carried._count._all,
      completedPoints: completed._sum.storyPoints ?? 0,
      carriedOverPoints: carried._sum.storyPoints ?? 0,
    };
  });

  if (!summary) {
    return NextResponse.json({ ok: false, error: "Active sprint not found or already completed." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, ...summary });
}