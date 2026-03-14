import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  invalidateTasksByProject,
  listTasksByProject,
} from "@/services/taskService";

const TASK_STATUSES = new Set(["TODO", "IN_PROGRESS", "DONE"]);
const TASK_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH"]);

type TaskPayload = {
  projectId?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
};

function parseDueDate(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { ok: false, error: "Project id is required." },
      { status: 400 },
    );
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: user.id,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    return NextResponse.json(
      { ok: false, error: "Project not found." },
      { status: 404 },
    );
  }

  const tasks = await listTasksByProject(projectId);

  return NextResponse.json({ ok: true, tasks });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let payload: TaskPayload | null = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const projectId =
    typeof payload?.projectId === "string" ? payload.projectId : "";
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const description =
    typeof payload?.description === "string"
      ? payload.description.trim()
      : "";
  const status =
    typeof payload?.status === "string" && TASK_STATUSES.has(payload.status)
      ? payload.status
      : "TODO";
  const priority =
    typeof payload?.priority === "string" && TASK_PRIORITIES.has(payload.priority)
      ? payload.priority
      : "MEDIUM";
  const dueDate = parseDueDate(payload?.dueDate ?? null);

  if (!projectId) {
    return NextResponse.json(
      { ok: false, error: "Project id is required." },
      { status: 400 },
    );
  }

  if (title.length < 2) {
    return NextResponse.json(
      { ok: false, error: "Task title must be at least 2 characters." },
      { status: 400 },
    );
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: user.id,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    return NextResponse.json(
      { ok: false, error: "Project not found." },
      { status: 404 },
    );
  }

  const task = await prisma.$transaction(async (tx) => {
    const createdTask = await tx.task.create({
      data: {
        title,
        description: description || null,
        status,
        priority,
        dueDate,
        projectId,
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
      },
    });

    await tx.activity.create({
      data: {
        type: "TASK_CREATED",
        message: `created task "${createdTask.title}"`,
        userId: user.id,
        projectId,
        taskId: createdTask.id,
      },
    });

    return createdTask;
  });

  await invalidateTasksByProject(projectId);

  return NextResponse.json({ ok: true, task }, { status: 201 });
}
