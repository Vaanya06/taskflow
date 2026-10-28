import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (actor.role !== UserRole.ADMIN) {
    return NextResponse.json({ ok: false, error: "Administrator access is required." }, { status: 403 });
  }

  const { id: teamId } = await params;
  let payload: { userId?: unknown } | null = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const userId = typeof payload?.userId === "string" ? payload.userId : "";
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Choose a team member." }, { status: 400 });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      memberships: {
        where: { role: "MANAGER" },
        select: { userId: true },
      },
    },
  });
  if (!team) {
    return NextResponse.json({ ok: false, error: "Team not found." }, { status: 404 });
  }
  const isMember = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { id: true },
  });
  if (!isMember) {
    return NextResponse.json({ ok: false, error: "The new manager must already be a team member." }, { status: 400 });
  }
  const newManager = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!newManager || newManager.role === UserRole.ADMIN) {
    return NextResponse.json({ ok: false, error: "Choose a non-administrator account as team manager." }, { status: 400 });
  }

  const previousManagerIds = team.memberships.map((membership) => membership.userId);
  if (previousManagerIds.includes(userId)) {
    return NextResponse.json({ ok: true });
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamMembership.update({
      where: { teamId_userId: { teamId, userId } },
      data: { role: "MANAGER" },
    });
    await tx.teamMembership.updateMany({
      where: { teamId, userId: { in: previousManagerIds } },
      data: { role: "MEMBER" },
    });
    await tx.user.update({
      where: { id: userId },
      data: { role: UserRole.MANAGER },
    });

    for (const previousManagerId of previousManagerIds) {
      const otherManagedTeams = await tx.teamMembership.count({
        where: {
          userId: previousManagerId,
          role: "MANAGER",
        },
      });
      if (otherManagedTeams === 0) {
        await tx.user.updateMany({
          where: { id: previousManagerId, role: UserRole.MANAGER },
          data: { role: UserRole.USER },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
