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
      {
        team: {
          memberships: {
            some: {
              userId,
            },
          },
        },
      },
    ],
  };
}

export function accessibleTaskWhere(userId: string): Prisma.TaskWhereInput {
  return {
    OR: [
      {
        assigneeId: userId,
      },
      {
        assigneeId: null,
      },
      {
        project: {
          ownerId: userId,
        },
      },
      {
        project: {
          team: {
            memberships: {
              some: {
                userId,
                role: "MANAGER",
              },
            },
          },
        },
      },
    ],
  };
}
