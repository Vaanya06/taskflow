type ProjectTaskAccessContext = {
  ownerId: string;
  members: { userId: string }[];
  team: { memberships: { userId: string; role: "MANAGER" | "MEMBER" }[] } | null;
};

export function isProjectOwner(project: ProjectTaskAccessContext, userId: string) {
  return project.ownerId === userId;
}

export function isProjectMember(project: ProjectTaskAccessContext, userId: string) {
  return project.members.some((member) => member.userId === userId);
}

export function isTeamManager(project: ProjectTaskAccessContext, userId: string) {
  return project.team?.memberships.some(
    (membership) => membership.userId === userId && membership.role === "MANAGER",
  ) === true;
}

export function canManageProject(
  project: ProjectTaskAccessContext,
  userId: string,
) {
  return isProjectOwner(project, userId) || isTeamManager(project, userId);
}

export function canManageProjectTasks(
  project: ProjectTaskAccessContext,
  userId: string,
) {
  return canManageProject(project, userId) || isProjectMember(project, userId);
}
