import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER) {
    return NextResponse.json({ ok: true, teams: [] });
  }

  const teams = await prisma.team.findMany({
    where: user.role === UserRole.ADMIN
      ? undefined
      : { memberships: { some: { userId: user.id, role: "MANAGER" } } },
    orderBy: { name: "asc" },
    include: {
      memberships: {
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      projects: {
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      },
    },
  });

  return NextResponse.json({ ok: true, teams });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (user.role !== UserRole.ADMIN) {
    return NextResponse.json({ ok: false, error: "Administrator access is required." }, { status: 403 });
  }

  let payload: { name?: unknown; managerEmail?: unknown } | null = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  const managerEmail = typeof payload?.managerEmail === "string" ? payload.managerEmail.trim() : "";
  if (name.length < 2 || name.length > 80 || !managerEmail) {
    return NextResponse.json({ ok: false, error: "Enter a team name and an existing manager account email." }, { status: 400 });
  }

  const manager = await prisma.user.findFirst({
    where: { email: { equals: managerEmail, mode: "insensitive" } },
    select: { id: true, role: true },
  });
  if (!manager) {
    return NextResponse.json({ ok: false, error: "No account found with that email." }, { status: 404 });
  }
  if (manager.role === UserRole.ADMIN) {
    return NextResponse.json({ ok: false, error: "Choose a user or manager account, not an administrator." }, { status: 400 });
  }

  const team = await prisma.$transaction(async (tx) => {
    const updatedManager = await tx.user.update({
      where: { id: manager.id },
      data: { role: UserRole.MANAGER },
      select: { id: true },
    });
    const createdTeam = await tx.team.create({
      data: {
        name,
        createdById: user.id,
        memberships: {
          create: { userId: updatedManager.id, role: "MANAGER" },
        },
      },
      select: { id: true, name: true },
    });
    return createdTeam;
  });

  return NextResponse.json({ ok: true, team }, { status: 201 });
}
