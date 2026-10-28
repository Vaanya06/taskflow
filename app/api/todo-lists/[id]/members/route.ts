import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { accessibleTodoListWhere } from "@/lib/todo-access";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;
  const list = await prisma.todoList.findFirst({
    where: { id, ...accessibleTodoListWhere(user.id) },
    select: {
      ownerId: true,
      owner: { select: { id: true, name: true, email: true } },
      memberships: { select: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!list) {
    return NextResponse.json({ ok: false, error: "List not found." }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    owner: list.owner,
    members: list.memberships.map((membership) => membership.user),
    canManage: list.ownerId === user.id,
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const list = await prisma.todoList.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });
  if (!list) {
    return NextResponse.json({ ok: false, error: "List not found." }, { status: 404 });
  }
  if (list.ownerId !== user.id) {
    return NextResponse.json({ ok: false, error: "Only the list owner can share it." }, { status: 403 });
  }

  let payload: { email?: unknown } | null = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Enter a valid account email." }, { status: 400 });
  }

  const invitee = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });
  if (!invitee) {
    return NextResponse.json({ ok: false, error: "No Taskflow account uses that email." }, { status: 404 });
  }
  if (invitee.id === user.id) {
    return NextResponse.json({ ok: false, error: "You already own this list." }, { status: 400 });
  }

  try {
    await prisma.todoListMembership.create({
      data: { listId: id, userId: invitee.id },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: false, error: "That person already has access." }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true, member: invitee }, { status: 201 });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;
  const list = await prisma.todoList.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!list) {
    return NextResponse.json({ ok: false, error: "List not found." }, { status: 404 });
  }
  if (list.ownerId !== user.id) {
    return NextResponse.json({ ok: false, error: "Only the list owner can manage sharing." }, { status: 403 });
  }

  let payload: { email?: unknown } | null = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ ok: false, error: "Member email is required." }, { status: 400 });
  }
  await prisma.todoListMembership.deleteMany({
    where: { listId: id, user: { email } },
  });
  return NextResponse.json({ ok: true });
}
