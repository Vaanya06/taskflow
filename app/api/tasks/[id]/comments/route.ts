import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CommentPayload = {
  content?: string;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id: taskId } = await params;
  if (!taskId) {
    return NextResponse.json(
      { ok: false, error: "Task id is required." },
      { status: 400 },
    );
  }

  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    select: {
      id: true,
      title: true,
      projectId: true,
      project: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!task || task.project.ownerId !== user.id) {
    return NextResponse.json(
      { ok: false, error: "Task not found." },
      { status: 404 },
    );
  }

  const comments = await prisma.comment.findMany({
    where: {
      taskId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  const normalized = comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    author: comment.user.name || comment.user.email,
  }));

  return NextResponse.json({ ok: true, comments: normalized });
}

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id: taskId } = await params;
  if (!taskId) {
    return NextResponse.json(
      { ok: false, error: "Task id is required." },
      { status: 400 },
    );
  }

  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    select: {
      id: true,
      title: true,
      projectId: true,
      project: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!task || task.project.ownerId !== user.id) {
    return NextResponse.json(
      { ok: false, error: "Task not found." },
      { status: 404 },
    );
  }

  let payload: CommentPayload | null = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const content =
    typeof payload?.content === "string" ? payload.content.trim() : "";

  if (!content) {
    return NextResponse.json(
      { ok: false, error: "Comment cannot be empty." },
      { status: 400 },
    );
  }

  const comment = await prisma.$transaction(async (tx) => {
    const createdComment = await tx.comment.create({
      data: {
        content,
        taskId,
        userId: user.id,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    await tx.activity.create({
      data: {
        type: "TASK_COMMENTED",
        message: `commented on task "${task.title}"`,
        userId: user.id,
        projectId: task.projectId,
        taskId,
      },
    });

    return createdComment;
  });

  return NextResponse.json(
    {
      ok: true,
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        author: comment.user.name || comment.user.email,
      },
    },
    { status: 201 },
  );
}
