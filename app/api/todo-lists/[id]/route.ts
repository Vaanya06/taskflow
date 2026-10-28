import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { accessibleTodoListWhere } from "@/lib/todo-access";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const list = await prisma.todoList.findFirst({
    where: { id, ...accessibleTodoListWhere(user.id) },
    select: { id: true, ownerId: true, isInbox: true },
  });
  if (!list) {
    return NextResponse.json({ ok: false, error: "List not found." }, { status: 404 });
  }
  if (list.ownerId !== user.id) {
    return NextResponse.json({ ok: false, error: "Only the list owner can rename it." }, { status: 403 });
  }
  if (list.isInbox) {
    return NextResponse.json({ ok: false, error: "The Inbox list cannot be renamed." }, { status: 400 });
  }

  let payload: { name?: unknown } | null = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  if (name.length < 1 || name.length > 60) {
    return NextResponse.json({ ok: false, error: "List name must be 1 to 60 characters." }, { status: 400 });
  }
  const updated = await prisma.todoList.update({
    where: { id },
    data: { name },
    select: { id: true, name: true, isInbox: true, ownerId: true },
  });
  return NextResponse.json({ ok: true, list: updated });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const list = await prisma.todoList.findFirst({
    where: { id, ...accessibleTodoListWhere(user.id) },
    select: { id: true, ownerId: true, isInbox: true },
  });
  if (!list) {
    return NextResponse.json({ ok: false, error: "List not found." }, { status: 404 });
  }
  if (list.ownerId !== user.id) {
    return NextResponse.json({ ok: false, error: "Only the list owner can delete it." }, { status: 403 });
  }
  if (list.isInbox) {
    return NextResponse.json({ ok: false, error: "The Inbox list cannot be deleted." }, { status: 400 });
  }

  await prisma.todoList.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
