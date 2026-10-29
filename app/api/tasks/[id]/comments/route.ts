import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { accessibleTaskWhere } from "@/project-access";
import {
  buildTaskNotifications,
  getTaskNotificationRecipientIds,
} from "@/services/notifications";

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

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      ...accessibleTaskWhere(user.id),
    },
    select: {
      id: true,
      title: true,
      projectId: true,
    },
  });

  if (!task) {
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

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      ...accessibleTaskWhere(user.id),
    },
    select: {
      id: true,
      title: true,
      projectId: true,
      assigneeId: true,
      project: {
        select: {
          ownerId: true,
          members: { select: { userId: true } },
          team: {
            select: {
              memberships: { select: { userId: true, role: true } },
            },
          },
        },
      },
    },
  });

  if (!task) {
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

  const taskRecipientIds = getTaskNotificationRecipientIds(
    task.project,
    task.assigneeId,
    task.assigneeId === null,
  );
  const mentionedEmails = [...new Set(
    Array.from(content.matchAll(/@([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi))
      .map((match) => match[1].toLowerCase()),
  )];
  const mentionedUsers = mentionedEmails.length
    ? await prisma.user.findMany({
        where: {
          id: { in: taskRecipientIds },
          email: { in: mentionedEmails, mode: "insensitive" },
        },
        select: { id: true },
      })
    : [];
  const mentionedUserIds = new Set(mentionedUsers.map((mentionedUser) => mentionedUser.id));
  const commenterLabel = user.name || user.email;

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

    const commentNotifications = buildTaskNotifications({
      recipientIds: taskRecipientIds.filter((recipientId) => !mentionedUserIds.has(recipientId)),
      actorId: user.id,
      projectId: task.projectId,
      taskId,
      type: "TASK_COMMENTED",
      message: `${commenterLabel} commented on "${task.title}"`,
    });
    if (commentNotifications.length) {
      await tx.notification.createMany({ data: commentNotifications });
    }

    const mentionNotifications = buildTaskNotifications({
      recipientIds: mentionedUsers.map((mentionedUser) => mentionedUser.id),
      actorId: user.id,
      projectId: task.projectId,
      taskId,
      type: "MENTIONED",
      message: `${commenterLabel} mentioned you on "${task.title}"`,
    });
    if (mentionNotifications.length) {
      await tx.notification.createMany({ data: mentionNotifications });
    }

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
