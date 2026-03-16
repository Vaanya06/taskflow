import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { accessibleProjectWhere } from "@/project-access";

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
    },
  });

  if (!project) {
    return NextResponse.json(
      { ok: false, error: "Project not found." },
      { status: 404 },
    );
  }

  if (project.ownerId !== user.id) {
    return NextResponse.json(
      { ok: false, error: "Only the project owner can create sprints." },
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

  const sprint = await prisma.$transaction(async (tx) => {
    if (isActive) {
      await tx.sprint.updateMany({
        where: {
          projectId,
        },
        data: {
          isActive: false,
        },
      });
    }

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