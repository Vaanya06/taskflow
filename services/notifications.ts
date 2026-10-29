import type { Prisma } from "@prisma/client";

export type NotificationKind =
  | "TASK_ASSIGNED"
  | "TASK_UNASSIGNED"
  | "TASK_COMMENTED"
  | "MENTIONED"
  | "DUE_DATE_CHANGED";

type ProjectNotificationAccess = {
  ownerId: string;
  members: { userId: string }[];
  team: {
    memberships: { userId: string; role: "MANAGER" | "MEMBER" }[];
  } | null;
};

export function getTaskNotificationRecipientIds(
  project: ProjectNotificationAccess,
  assigneeId: string | null,
  includeTeamMembers = false,
) {
  return [
    ...new Set([
      project.ownerId,
      ...project.members.map((member) => member.userId),
      ...(project.team?.memberships
        .filter((member) => includeTeamMembers || member.role === "MANAGER")
        .map((member) => member.userId) ?? []),
      ...(assigneeId ? [assigneeId] : []),
    ]),
  ];
}

export function buildTaskNotifications(input: {
  recipientIds: string[];
  actorId: string;
  projectId: string;
  taskId: string;
  type: NotificationKind;
  message: string;
}): Prisma.NotificationCreateManyInput[] {
  const recipientIds = [...new Set(input.recipientIds)].filter((id) => id !== input.actorId);
  return recipientIds.map((userId) => ({
    userId,
    actorId: input.actorId,
    projectId: input.projectId,
    taskId: input.taskId,
    type: input.type,
    message: input.message,
    href: `/projects/${input.projectId}?tab=board&taskId=${input.taskId}`,
  }));
}
