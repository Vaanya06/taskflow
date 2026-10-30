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

  let payload: { status?: unknown } | null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const status = payload?.status;
  if (typeof status !== "string" || !Object.values(TaskStatus).includes(status as TaskStatus)) {
    return NextResponse.json({ ok: false, error: "Choose a valid task status." }, { status: 400 });
  }

  const { id } = await params;
  const result = await prisma.task.updateMany({
    where: {
      id,
      projectId: COMPANY_TASK_PROJECT_ID,
      ...(user.role === UserRole.ADMIN ? {} : { assigneeId: user.id }),
    },
    data: { status: status as TaskStatus },
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
      dueDate: true,
      createdAt: true,
      updatedAt: true,
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ ok: true, task });
}
