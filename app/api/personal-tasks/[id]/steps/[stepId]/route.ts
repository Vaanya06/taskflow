import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findAccessibleTodoTask } from "@/lib/todo-access";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string; stepId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id, stepId } = await params;
  const task = await findAccessibleTodoTask(id, user.id);
  if (!task) {
    return NextResponse.json({ ok: false, error: "Task not found." }, { status: 404 });
  }

  let payload: { title?: unknown; isCompleted?: unknown } | null = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const data: { title?: string; isCompleted?: boolean } = {};
  if (payload?.title !== undefined) {
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    if (!title || title.length > 200) {
      return NextResponse.json({ ok: false, error: "Step title must be 1 to 200 characters." }, { status: 400 });
    }
    data.title = title;
  }
  if (payload?.isCompleted !== undefined) {
    if (typeof payload.isCompleted !== "boolean") {
      return NextResponse.json({ ok: false, error: "Completion must be true or false." }, { status: 400 });
    }
    data.isCompleted = payload.isCompleted;
  }
  if (!Object.keys(data).length) {
    return NextResponse.json({ ok: false, error: "No step changes provided." }, { status: 400 });
  }

  const result = await prisma.todoTaskStep.updateMany({
    where: { id: stepId, taskId: id },
    data,
  });
  if (!result.count) {
    return NextResponse.json({ ok: false, error: "Step not found." }, { status: 404 });
  }
  const step = await prisma.todoTaskStep.findUniqueOrThrow({ where: { id: stepId } });
  return NextResponse.json({ ok: true, step });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id, stepId } = await params;
  const task = await findAccessibleTodoTask(id, user.id);
  if (!task) {
    return NextResponse.json({ ok: false, error: "Task not found." }, { status: 404 });
  }
  const result = await prisma.todoTaskStep.deleteMany({
    where: { id: stepId, taskId: id },
  });
  if (!result.count) {
    return NextResponse.json({ ok: false, error: "Step not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
