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

  let payload: { status?: unknown; priority?: unknown } | null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const submittedKeys = Object.keys(payload ?? {});
  const status = payload?.status;
  const priority = payload?.priority;
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
  if (status === undefined && priority === undefined) {
    return NextResponse.json({ ok: false, error: "No task updates provided." }, { status: 400 });
  }

  const { id } = await params;
  const result = await prisma.task.updateMany({
    where: {
      id,
      projectId: COMPANY_TASK_PROJECT_ID,
      ...(user.role === UserRole.ADMIN ? {} : { assigneeId: user.id }),
    },
    data: {
      ...(status === undefined ? {} : { status: status as TaskStatus }),
      ...(priority === undefined ? {} : { priority: priority as "LOW" | "MEDIUM" | "HIGH" }),
    },
  });
  if (result.count === 0) {
    return NextResponse.json({ ok: false, error: "Task not found or access denied." }, { status: 404 });
  }

  const task = await prisma.task.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ ok: true, task });
}
