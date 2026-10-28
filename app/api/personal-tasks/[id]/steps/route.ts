import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findAccessibleTodoTask } from "@/lib/todo-access";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;
  const task = await findAccessibleTodoTask(id, user.id);
  if (!task) {
    return NextResponse.json({ ok: false, error: "Task not found." }, { status: 404 });
  }

  let payload: { title?: unknown } | null = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  if (!title || title.length > 200) {
    return NextResponse.json({ ok: false, error: "Step title must be 1 to 200 characters." }, { status: 400 });
  }
  const step = await prisma.todoTaskStep.create({
    data: { title, taskId: id },
  });
  return NextResponse.json({ ok: true, step }, { status: 201 });
}
