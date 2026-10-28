import { NextResponse } from "next/server";
import { TodoRepeat, type Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { accessibleTodoListWhere, ensureInboxList } from "@/lib/todo-access";
import { prisma } from "@/lib/prisma";

function dayRange(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    return null;
  }
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { gte: start, lt: end };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const inbox = await ensureInboxList(user.id);
  const url = new URL(request.url);
  const view = url.searchParams.get("view") || "my-day";
  const listId = url.searchParams.get("listId");
  const query = url.searchParams.get("q")?.trim();
  const where: Prisma.TodoTaskWhereInput = {
    list: accessibleTodoListWhere(user.id),
  };
  const filters: Prisma.TodoTaskWhereInput[] = [];
  const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);

  if (view === "my-day") {
    const range = dayRange(date);
    if (!range) {
      return NextResponse.json({ ok: false, error: "Invalid day." }, { status: 400 });
    }
    where.myDayEntries = { some: { userId: user.id, date: range } };
  } else if (view === "suggestions") {
    const range = dayRange(date);
    if (!range) {
      return NextResponse.json({ ok: false, error: "Invalid day." }, { status: 400 });
    }
    where.isCompleted = false;
    where.myDayEntries = { none: { userId: user.id, date: range } };
    filters.push({
      OR: [{ important: true }, { dueDate: { lt: range.lt } }],
    });
  } else if (view === "important") {
    where.important = true;
  } else if (view === "planned") {
    where.dueDate = { not: null };
  } else if (view === "list") {
    if (!listId) {
      return NextResponse.json({ ok: false, error: "List id is required." }, { status: 400 });
    }
    where.listId = listId;
  } else if (view !== "all") {
    return NextResponse.json({ ok: false, error: "Unknown task view." }, { status: 400 });
  }

  if (query) {
    filters.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { note: { contains: query, mode: "insensitive" } },
      ],
    });
  }
  if (filters.length) where.AND = filters;

  const tasks = await prisma.todoTask.findMany({
      where,
      orderBy: [{ isCompleted: "asc" }, { important: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      include: {
        list: { select: { id: true, name: true, ownerId: true } },
        steps: { orderBy: { createdAt: "asc" } },
        myDayEntries: { where: { userId: user.id }, select: { date: true } },
      },
    });
  return NextResponse.json({
    ok: true,
    tasks: tasks.map(({ myDayEntries, ...task }) => ({
      ...task,
      myDayDate: myDayEntries[0]?.date ?? null,
    })),
    inboxListId: inbox.id,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let payload: {
    title?: unknown;
    note?: unknown;
    listId?: unknown;
    important?: unknown;
    dueDate?: unknown;
    reminderAt?: unknown;
    myDayDate?: unknown;
    repeat?: unknown;
  } | null = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  if (!title || title.length > 200) {
    return NextResponse.json({ ok: false, error: "Task title must be 1 to 200 characters." }, { status: 400 });
  }

  const inbox = await ensureInboxList(user.id);
  const listId = typeof payload?.listId === "string" ? payload.listId : inbox.id;
  const list = await prisma.todoList.findFirst({
    where: { id: listId, ...accessibleTodoListWhere(user.id) },
    select: { id: true },
  });
  if (!list) {
    return NextResponse.json({ ok: false, error: "List not found or access denied." }, { status: 404 });
  }

  const parseDate = (value: unknown) => {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string") return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };
  const dueDate = parseDate(payload?.dueDate);
  const reminderAt = parseDate(payload?.reminderAt);
  const myDayDate = parseDate(payload?.myDayDate);
  if (dueDate === undefined || reminderAt === undefined || myDayDate === undefined) {
    return NextResponse.json({ ok: false, error: "Enter valid due, reminder, and My Day dates." }, { status: 400 });
  }

  const repeat = payload?.repeat ?? null;
  if (repeat !== null && !Object.values(TodoRepeat).includes(repeat as TodoRepeat)) {
    return NextResponse.json({ ok: false, error: "Choose a valid repeat interval." }, { status: 400 });
  }
  const note = typeof payload?.note === "string" ? payload.note.trim() : null;

  const task = await prisma.todoTask.create({
    data: {
      title,
      note,
      listId,
      creatorId: user.id,
      important: payload?.important === true,
      dueDate,
      reminderAt,
      repeat: repeat as TodoRepeat | null,
      ...(myDayDate
        ? { myDayEntries: { create: { userId: user.id, date: myDayDate } } }
        : {}),
    },
    include: {
      list: { select: { id: true, name: true, ownerId: true } },
      steps: true,
      myDayEntries: { where: { userId: user.id }, select: { date: true } },
    },
  });
  const { myDayEntries, ...taskData } = task;
  return NextResponse.json({
    ok: true,
    task: { ...taskData, myDayDate: myDayEntries[0]?.date ?? null },
  }, { status: 201 });
}
