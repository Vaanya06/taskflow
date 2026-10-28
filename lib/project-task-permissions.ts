import type { UserRole } from "@prisma/client";

type ProjectTaskAccessContext = {
  ownerId: string;
  members: { userId: string }[];
  team: { memberships: { userId: string; role: "MANAGER" | "MEMBER" }[] } | null;
};

export function canManageProjectTasks(
  project: ProjectTaskAccessContext,
  userId: string,
  userRole: UserRole,
) {
  return project.ownerId === userId ||
    project.members.some((member) => member.userId === userId) ||
    (userRole === "MANAGER" &&
      project.team?.memberships.some(
        (membership) => membership.userId === userId && membership.role === "MANAGER",
      ) === true);
}
