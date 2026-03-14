import "server-only";

import { prisma } from "@/lib/prisma";
import { cacheDel, cacheGet, cacheSet } from "@/lib/cache";

type TaskSummary = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

const TASKS_TTL_SECONDS = 60;

const tasksCacheKey = (projectId: string) => `tasks:project:${projectId}`;

export async function listTasksByProject(
  projectId: string,
): Promise<TaskSummary[]> {
  const cacheKey = tasksCacheKey(projectId);
  const cached = await cacheGet<TaskSummary[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const normalized = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }));

  await cacheSet(cacheKey, normalized, TASKS_TTL_SECONDS);

  return normalized;
}

export async function invalidateTasksByProject(projectId: string) {
  await cacheDel(tasksCacheKey(projectId));
}
