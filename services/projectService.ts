import "server-only";

import { prisma } from "@/lib/prisma";
import { cacheDel, cacheGet, cacheSet } from "@/lib/cache";

type ProjectSummary = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
};

const PROJECTS_TTL_SECONDS = 60;

const projectsCacheKey = (ownerId: string) => `projects:owner:${ownerId}`;

export async function listProjectsByOwner(
  ownerId: string,
): Promise<ProjectSummary[]> {
  const cacheKey = projectsCacheKey(ownerId);
  const cached = await cacheGet<ProjectSummary[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const projects = await prisma.project.findMany({
    where: {
      ownerId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
    },
  });

  const normalized = projects.map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
  }));

  await cacheSet(cacheKey, normalized, PROJECTS_TTL_SECONDS);

  return normalized;
}

export async function invalidateProjectsByOwner(ownerId: string) {
  await cacheDel(projectsCacheKey(ownerId));
}
