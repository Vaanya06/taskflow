import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidateProjectsForUser } from "@/services/projectService";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id: teamId } = await params;
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER) {
    return NextResponse.json({ ok: false, error: "Manager access is required." }, { status: 403 });
  }

  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      memberships: user.role === UserRole.ADMIN
        ? undefined
        : { some: { userId: user.id, role: "MANAGER" } },
    },
    select: { id: true, memberships: { select: { userId: true } } },
  });
  if (!team) {
    return NextResponse.json({ ok: false, error: "Team not found or manager access required." }, { status: 404 });
  }

  let payload: { email?: unknown } | null = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const email = typeof payload?.email === "string" ? payload.email.trim() : "";
  if (!email) {
    return NextResponse.json({ ok: false, error: "Member email is required." }, { status: 400 });
  }

  const member = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, name: true, email: true },
  });
  if (!member) {
    return NextResponse.json({ ok: false, error: "No account found with that email." }, { status: 404 });
  }
  if (team.memberships.some((membership) => membership.userId === member.id)) {
    return NextResponse.json({ ok: false, error: "That user is already on this team." }, { status: 409 });
  }

  await prisma.teamMembership.create({
    data: { teamId, userId: member.id, role: "MEMBER" },
  });
  await invalidateProjectsForUser(member.id);

  return NextResponse.json({ ok: true, member }, { status: 201 });
}
