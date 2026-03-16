import "server-only";

import { prisma } from "@/lib/prisma";
import { cacheDel, cacheGet, cacheSet } from "@/lib/cache";

type TaskSummary = {
  id: string;
  title: string;
  description: string | null;
  issueType: string;
  status: string;
  priority: string;
  storyPoints: number | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  sprint: {
    id: string;
    title: string;
    isActive: boolean;
  } | null;
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
      issueType: true,
      status: true,
      priority: true,
      storyPoints: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      sprint: {
        select: {
          id: true,
          title: true,
          isActive: true,
        },
      },
    },
  });

  const normalized = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    issueType: task.issueType,
    status: task.status,
    priority: task.priority,
    storyPoints: task.storyPoints,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    assignee: task.assignee,
    sprint: task.sprint,
  }));

  await cacheSet(cacheKey, normalized, TASKS_TTL_SECONDS);

  return normalized;
}

export async function invalidateTasksByProject(projectId: string) {
  await cacheDel(tasksCacheKey(projectId));
}