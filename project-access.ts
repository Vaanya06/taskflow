import type { Prisma } from "@prisma/client";

export function accessibleProjectWhere(userId: string): Prisma.ProjectWhereInput {
  return {
    OR: [
      {
        ownerId: userId,
      },
      {
        members: {
          some: {
            userId,
          },
        },
      },
    ],
  };
}

export function accessibleTaskWhere(userId: string): Prisma.TaskWhereInput {
  return {
    project: accessibleProjectWhere(userId),
  };
}
