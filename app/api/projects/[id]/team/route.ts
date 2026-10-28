import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accessibleProjectWhere } from "@/project-access";
import { invalidateProjectsForUser } from "@/services/projectService";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id: projectId } = await params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...accessibleProjectWhere(user.id) },
    select: {
      id: true,
      ownerId: true,
      team: { select: { memberships: { select: { userId: true } } } },
      members: { select: { userId: true } },
    },
  });
  if (!project) {
    return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
  }
  const isProjectMember = project.members.some((member) => member.userId === user.id);
  if (project.ownerId !== user.id && !isProjectMember) {
    return NextResponse.json({ ok: false, error: "Only a project owner or member who manages a team can connect it." }, { status: 403 });
  }

  let payload: { teamId?: unknown } | null = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const teamId = typeof payload?.teamId === "string" && payload.teamId ? payload.teamId : null;
  if (teamId) {
    if (user.role !== UserRole.MANAGER && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ ok: false, error: "Manager access is required to connect a team." }, { status: 403 });
    }
    const managedTeam = await prisma.team.findFirst({
      where: {
        id: teamId,
        memberships: { some: { userId: user.id, role: "MANAGER" } },
      },
      select: { id: true },
    });
    if (!managedTeam) {
      return NextResponse.json({ ok: false, error: "Choose a team you manage." }, { status: 403 });
    }
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: { teamId },
    select: {
      members: { select: { userId: true } },
      team: { select: { memberships: { select: { userId: true } } } },
    },
  });
  const userIds = new Set([
    user.id,
    ...project.members.map((member) => member.userId),
    ...(project.team?.memberships.map((member) => member.userId) ?? []),
    ...updatedProject.members.map((member) => member.userId),
    ...(updatedProject.team?.memberships.map((member) => member.userId) ?? []),
  ]);
  await Promise.all(Array.from(userIds, (userId) => invalidateProjectsForUser(userId)));

  return NextResponse.json({ ok: true });
}
