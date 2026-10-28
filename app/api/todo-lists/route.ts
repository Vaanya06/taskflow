import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { accessibleTodoListWhere, ensureInboxList } from "@/lib/todo-access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  await ensureInboxList(user.id);
  const lists = await prisma.todoList.findMany({
    where: accessibleTodoListWhere(user.id),
    orderBy: [{ isInbox: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      isInbox: true,
      ownerId: true,
      _count: { select: { tasks: { where: { isCompleted: false } } } },
    },
  });

  return NextResponse.json({ ok: true, lists });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
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

  const list = await prisma.todoList.create({
    data: { name, ownerId: user.id },
    select: { id: true, name: true, isInbox: true, ownerId: true },
  });
  return NextResponse.json({ ok: true, list }, { status: 201 });
}
