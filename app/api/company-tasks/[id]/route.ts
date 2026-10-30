import { NextResponse } from "next/server";
import { TaskStatus, UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMPANY_TASK_PROJECT_ID } from "@/services/company-tasks";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let payload: { status?: unknown; priority?: unknown; assigneeId?: unknown } | null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const submittedKeys = Object.keys(payload ?? {});
  const status = payload?.status;
  const priority = payload?.priority;
  const assigneeId = payload?.assigneeId;
  const allowedKeys = user.role === UserRole.ADMIN
    ? new Set(["status", "priority", "assigneeId"])
    : new Set(["status"]);
  if (submittedKeys.some((key) => !allowedKeys.has(key))) {
    return NextResponse.json({ ok: false, error: "Unsupported task update." }, { status: 400 });
  }
  if (user.role !== UserRole.ADMIN && (submittedKeys.length !== 1 || submittedKeys[0] !== "status")) {
    return NextResponse.json({ ok: false, error: "Employees can update task status only." }, { status: 403 });
  }
  if (status !== undefined && (typeof status !== "string" || !Object.values(TaskStatus).includes(status as TaskStatus))) {
    return NextResponse.json({ ok: false, error: "Choose a valid task status." }, { status: 400 });
  }
  if (priority !== undefined && user.role !== UserRole.ADMIN) {
    return NextResponse.json({ ok: false, error: "Only administrators can change task priority." }, { status: 403 });
  }
  if (priority !== undefined && (typeof priority !== "string" || !["LOW", "MEDIUM", "HIGH"].includes(priority))) {
    return NextResponse.json({ ok: false, error: "Choose a valid task priority." }, { status: 400 });
  }
  let nextAssigneeId: string | null | undefined;
  if (assigneeId !== undefined) {
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json({ ok: false, error: "Only administrators can change task assignments." }, { status: 403 });
    }
    if (assigneeId !== null && (typeof assigneeId !== "string" || !assigneeId.trim())) {
      return NextResponse.json({ ok: false, error: "Choose a valid employee." }, { status: 400 });
    }
    nextAssigneeId = typeof assigneeId === "string" ? assigneeId.trim() : null;
    if (nextAssigneeId) {
      const employee = await prisma.user.findFirst({
        where: { id: nextAssigneeId, role: { not: UserRole.ADMIN } },
        select: { id: true },
      });
      if (!employee) {
        return NextResponse.json({ ok: false, error: "Choose an active employee account." }, { status: 400 });
      }
    }
  }
  if (status === undefined && priority === undefined && nextAssigneeId === undefined) {
    return NextResponse.json({ ok: false, error: "No task updates provided." }, { status: 400 });
  }

  const { id } = await params;
  const task = await prisma.$transaction(async (tx) => {
    const existing = await tx.task.findFirst({
      where: {
        id,
        projectId: COMPANY_TASK_PROJECT_ID,
        ...(user.role === UserRole.ADMIN ? {} : { assigneeId: user.id }),
      },
      select: { id: true, title: true, assigneeId: true },
    });
    if (!existing) return null;

    const updated = await tx.task.update({
      where: { id: existing.id },
      data: {
        ...(status === undefined ? {} : { status: status as TaskStatus }),
        ...(priority === undefined ? {} : { priority: priority as "LOW" | "MEDIUM" | "HIGH" }),
        ...(nextAssigneeId === undefined ? {} : { assigneeId: nextAssigneeId }),
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
        assigneeId: true,
        assignee: { select: { id: true, name: true, email: true } },
        checklistItems: {
          orderBy: { position: "asc" },
          select: { id: true, title: true, isCompleted: true, position: true },
        },
      },
    });

    if (nextAssigneeId !== undefined && nextAssigneeId !== existing.assigneeId) {
      const notifications = [];
      if (existing.assigneeId) {
        if (existing.assigneeId !== user.id) {
          notifications.push({
            userId: existing.assigneeId,
            actorId: user.id,
            projectId: COMPANY_TASK_PROJECT_ID,
            taskId: updated.id,
            type: "TASK_UNASSIGNED" as const,
            message: `${user.name || user.email} reassigned "${existing.title}"`,
            href: "/company-tasks",
          });
        }
      }
      if (nextAssigneeId && nextAssigneeId !== user.id) {
        notifications.push({
          userId: nextAssigneeId,
          actorId: user.id,
          projectId: COMPANY_TASK_PROJECT_ID,
          taskId: updated.id,
          type: "TASK_ASSIGNED" as const,
          message: `${user.name || user.email} assigned you "${existing.title}"`,
          href: "/company-tasks",
        });
      }
      if (notifications.length) {
        await tx.notification.createMany({ data: notifications });
      }
    }
    return updated;
  });

  if (!task) {
    return NextResponse.json({ ok: false, error: "Task not found or access denied." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, task });
}
