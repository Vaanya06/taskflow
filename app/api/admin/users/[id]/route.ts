import { NextResponse } from "next/server";
import { Prisma, UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isUserRole(value: unknown): value is UserRole {
  return Object.values(UserRole).some((role) => role === value);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }
  if (actor.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Administrator access is required." },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (id === actor.id) {
    return NextResponse.json(
      { ok: false, error: "You cannot change your own administrator role." },
      { status: 400 },
    );
  }

  let payload: { role?: unknown } | null = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const role = payload?.role;
  if (!isUserRole(role) || role === UserRole.MANAGER) {
    return NextResponse.json(
      { ok: false, error: "Choose ADMIN or USER. Manager access is granted through team assignment." },
      { status: 400 },
    );
  }

  try {
    const updatedUser = await prisma.$transaction(
      async (transaction) => {
        const target = await transaction.user.findUnique({
          where: { id },
          select: { id: true, role: true },
        });
        if (!target) {
          return null;
        }

        if (target.role === UserRole.ADMIN && role === UserRole.USER) {
          const adminCount = await transaction.user.count({
            where: { role: UserRole.ADMIN },
          });
          if (adminCount <= 1) {
            return "last-admin" as const;
          }
        }
        if (target.role === UserRole.MANAGER) {
          const managedTeamCount = await transaction.teamMembership.count({
            where: { userId: id, role: "MANAGER" },
          });
          if (managedTeamCount > 0) {
            return "managed-teams" as const;
          }
        }

        return transaction.user.update({
          where: { id },
          data: { role },
          select: { id: true, email: true, name: true, role: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (updatedUser === null) {
      return NextResponse.json(
        { ok: false, error: "User not found." },
        { status: 404 },
      );
    }
    if (updatedUser === "last-admin") {
      return NextResponse.json(
        { ok: false, error: "The last administrator cannot be demoted." },
        { status: 409 },
      );
    }
    if (updatedUser === "managed-teams") {
      return NextResponse.json(
        { ok: false, error: "Assign another manager to this user's teams before changing their account role." },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true, user: updatedUser });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { ok: false, error: "Another role update occurred. Please try again." },
        { status: 409 },
      );
    }
    throw error;
  }
}
