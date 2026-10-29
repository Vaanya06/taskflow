import "server-only";

import { prisma } from "@/lib/prisma";

export async function recordActiveSprintProgress(projectId: string, sprintId?: string) {
  const sprint = await prisma.sprint.findFirst({
    where: {
      projectId,
      isActive: true,
      ...(sprintId ? { id: sprintId } : {}),
    },
    select: { id: true },
  });
  if (!sprint) {
    return;
  }

  const [scope, remainingTasks, remainingPoints] = await Promise.all([
    prisma.task.aggregate({
      where: { sprintId: sprint.id },
      _count: { _all: true },
      _sum: { storyPoints: true },
    }),
    prisma.task.count({
      where: { sprintId: sprint.id, status: { not: "DONE" } },
    }),
    prisma.task.aggregate({
      where: { sprintId: sprint.id, status: { not: "DONE" } },
      _sum: { storyPoints: true },
    }),
  ]);
  const now = new Date();
  const snapshotDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  await prisma.sprintProgressSnapshot.upsert({
    where: {
      sprintId_snapshotDate: {
        sprintId: sprint.id,
        snapshotDate,
      },
    },
    create: {
      sprintId: sprint.id,
      snapshotDate,
      scopeTasks: scope._count._all,
      scopePoints: scope._sum.storyPoints ?? 0,
      remainingTasks,
      remainingPoints: remainingPoints._sum.storyPoints ?? 0,
    },
    update: {
      scopeTasks: scope._count._all,
      scopePoints: scope._sum.storyPoints ?? 0,
      remainingTasks,
      remainingPoints: remainingPoints._sum.storyPoints ?? 0,
    },
  });
}
