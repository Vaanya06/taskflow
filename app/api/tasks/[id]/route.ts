import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { invalidateTasksByProject } from "@/services/taskService";

const TASK_STATUSES = new Set(["TODO", "IN_PROGRESS", "DONE"]);
const TASK_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH"]);

type TaskUpdatePayload = {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseDueDate(value: unknown): Date | null | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

export async function PATCH(
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

  const { id: taskId } = await params;
  if (!taskId) {
    return NextResponse.json(
      { ok: false, error: "Task id is required." },
      { status: 400 },
    );
  }

  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    select: {
      id: true,
      title: true,
      status: true,
      projectId: true,
      project: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!task || task.project.ownerId !== user.id) {
    return NextResponse.json(
      { ok: false, error: "Task not found." },
      { status: 404 },
    );
  }

  let payload: TaskUpdatePayload | null = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const data: {
    title?: string;
    description?: string | null;
    status?: "TODO" | "IN_PROGRESS" | "DONE";
    priority?: "LOW" | "MEDIUM" | "HIGH";
    dueDate?: Date | null;
  } = {};

  if (typeof payload?.title === "string") {
    const title = payload.title.trim();
    if (title.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Task title must be at least 2 characters." },
        { status: 400 },
      );
    }
    data.title = title;
  }

  if (typeof payload?.description === "string") {
    const description = payload.description.trim();
    data.description = description || null;
  }

  if (typeof payload?.status === "string") {
    if (!TASK_STATUSES.has(payload.status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status." },
        { status: 400 },
      );
    }
    data.status = payload.status as "TODO" | "IN_PROGRESS" | "DONE";
  }

  if (typeof payload?.priority === "string") {
    if (!TASK_PRIORITIES.has(payload.priority)) {
      return NextResponse.json(
        { ok: false, error: "Invalid priority." },
        { status: 400 },
      );
    }
    data.priority = payload.priority as "LOW" | "MEDIUM" | "HIGH";
  }

  if ("dueDate" in (payload ?? {})) {
    const parsed = parseDueDate(payload?.dueDate ?? null);
    if (parsed === undefined) {
      return NextResponse.json(
        { ok: false, error: "Invalid due date." },
        { status: 400 },
      );
    }
    data.dueDate = parsed;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { ok: false, error: "No updates provided." },
      { status: 400 },
    );
  }

  const shouldLogCompletion =
    data.status === "DONE" && task.status !== "DONE";

  const updatedTask = await prisma.$transaction(async (tx) => {
    const nextTask = await tx.task.update({
      where: {
        id: taskId,
      },
      data,
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

    if (shouldLogCompletion) {
      await tx.activity.create({
        data: {
          type: "TASK_COMPLETED",
          message: `completed task "${nextTask.title}"`,
          userId: user.id,
          projectId: task.projectId,
          taskId: nextTask.id,
        },
      });
    }

    return nextTask;
  });

  await invalidateTasksByProject(task.projectId);

  return NextResponse.json({ ok: true, task: updatedTask });
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id: taskId } = await params;
  if (!taskId) {
    return NextResponse.json(
      { ok: false, error: "Task id is required." },
      { status: 400 },
    );
  }

  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    select: {
      id: true,
      projectId: true,
      project: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!task || task.project.ownerId !== user.id) {
    return NextResponse.json(
      { ok: false, error: "Task not found." },
      { status: 404 },
    );
  }

  await prisma.task.delete({
    where: {
      id: taskId,
    },
  });

  await invalidateTasksByProject(task.projectId);

  return NextResponse.json({ ok: true });
}


