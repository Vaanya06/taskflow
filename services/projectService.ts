import "server-only";

import { prisma } from "@/lib/prisma";
import { cacheDel, cacheGet, cacheSet } from "@/lib/cache";
import { accessibleProjectWhere } from "@/project-access";

type ProjectSummary = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  owner: {
    id: string;
    name: string | null;
    email: string;
  };
  role: "OWNER" | "MEMBER";
  memberCount: number;
};

const PROJECTS_TTL_SECONDS = 60;

const projectsCacheKey = (userId: string) => `projects:user:${userId}`;

export async function listProjectsForUser(
  userId: string,
): Promise<ProjectSummary[]> {
  const cacheKey = projectsCacheKey(userId);
  const cached = await cacheGet<ProjectSummary[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const projects = await prisma.project.findMany({
    where: accessibleProjectWhere(userId),
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      ownerId: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      members: {
        select: {
          userId: true,
        },
      },
    },
  });

  const normalized: ProjectSummary[] = projects.map((project) => {
    const role: ProjectSummary["role"] = project.ownerId === userId ? "OWNER" : "MEMBER";

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      createdAt: project.createdAt.toISOString(),
      owner: project.owner,
      role,
      memberCount: new Set([project.ownerId, ...project.members.map((member) => member.userId)]).size,
    };
  });

  await cacheSet(cacheKey, normalized, PROJECTS_TTL_SECONDS);

  return normalized;
}

export async function invalidateProjectsForUser(userId: string) {
  await cacheDel(projectsCacheKey(userId));
}
