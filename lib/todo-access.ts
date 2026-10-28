import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function accessibleTodoListWhere(userId: string): Prisma.TodoListWhereInput {
  return {
    OR: [
      { ownerId: userId },
      { memberships: { some: { userId } } },
    ],
  };
}

export async function ensureInboxList(userId: string) {
  const inbox = await prisma.todoList.findFirst({
    where: { inboxOwnerId: userId },
    select: { id: true },
  });
  if (inbox) {
    return inbox;
  }

  try {
    return await prisma.todoList.create({
      data: {
        name: "Inbox",
        isInbox: true,
        ownerId: userId,
        inboxOwnerId: userId,
      },
      select: { id: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const createdByAnotherRequest = await prisma.todoList.findFirst({
        where: { inboxOwnerId: userId },
        select: { id: true },
      });
      if (createdByAnotherRequest) return createdByAnotherRequest;
    }
    throw error;
  }
}

export async function findAccessibleTodoTask(taskId: string, userId: string) {
  const task = await prisma.todoTask.findFirst({
    where: {
      id: taskId,
      list: accessibleTodoListWhere(userId),
    },
    select: {
      id: true,
      title: true,
      note: true,
      isCompleted: true,
      important: true,
      dueDate: true,
      reminderAt: true,
      repeat: true,
      completedAt: true,
      listId: true,
      myDayEntries: {
        where: { userId },
        select: { date: true },
      },
      steps: {
        select: { title: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!task) return null;
  const { myDayEntries, ...taskData } = task;
  return { ...taskData, myDayDate: myDayEntries[0]?.date ?? null };
}
