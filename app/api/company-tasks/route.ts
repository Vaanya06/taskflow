import { NextResponse } from "next/server";
import { TaskStatus, UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMPANY_TASK_PROJECT_ID, ensureCompanyTaskProject } from "@/services/company-tasks";

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  assignee: { select: { id: true, name: true, email: true } },
} as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: {
      projectId: COMPANY_TASK_PROJECT_ID,
      ...(user.role === UserRole.ADMIN ? {} : { assigneeId: user.id }),
    },
    select: taskSelect,
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ ok: true, tasks });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (user.role !== UserRole.ADMIN) {
    return NextResponse.json({ ok: false, error: "Administrator access is required to assign tasks." }, { status: 403 });
  }

  let payload: { title?: unknown; description?: unknown; assigneeId?: unknown; dueDate?: unknown } | null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const description = typeof payload?.description === "string" ? payload.description.trim() : "";
  const assigneeId = typeof payload?.assigneeId === "string" ? payload.assigneeId.trim() : "";
  if (title.length < 2 || title.length > 200) {
    return NextResponse.json({ ok: false, error: "Task title must be between 2 and 200 characters." }, { status: 400 });
  }
  if (description.length > 2000) {
    return NextResponse.json({ ok: false, error: "Task description must be 2000 characters or fewer." }, { status: 400 });
  }
  if (!assigneeId) {
    return NextResponse.json({ ok: false, error: "Choose an employee to assign this task to." }, { status: 400 });
  }

  let dueDate: Date | null = null;
  if (payload?.dueDate !== undefined && payload.dueDate !== null && payload.dueDate !== "") {
    if (typeof payload.dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(payload.dueDate)) {
      return NextResponse.json({ ok: false, error: "Enter a valid due date." }, { status: 400 });
    }
    dueDate = new Date(`${payload.dueDate}T00:00:00.000Z`);
    if (Number.isNaN(dueDate.getTime()) || dueDate.toISOString().slice(0, 10) !== payload.dueDate) {
      return NextResponse.json({ ok: false, error: "Enter a valid due date." }, { status: 400 });
    }
  }

  const assignee = await prisma.user.findFirst({
    where: { id: assigneeId, role: { not: UserRole.ADMIN } },
    select: { id: true },
  });
  if (!assignee) {
    return NextResponse.json({ ok: false, error: "Choose an active employee account." }, { status: 400 });
  }

  const project = await ensureCompanyTaskProject(user.id);
  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      issueType: "TASK",
      status: TaskStatus.TODO,
      dueDate,
      projectId: project.id,
      assigneeId: assignee.id,
    },
    select: taskSelect,
  });

  return NextResponse.json({ ok: true, task }, { status: 201 });
}
