import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { invalidateProjectsForUser } from "@/services/projectService";
import { accessibleProjectWhere } from "@/project-access";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type MemberPayload = {
  email?: string;
};

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json(
      { ok: false, error: "Project id is required." },
      { status: 400 },
    );
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...accessibleProjectWhere(user.id),
    },
    select: {
      id: true,
      ownerId: true,
      owner: {
        select: {
          email: true,
        },
      },
      members: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json(
      { ok: false, error: "Project not found." },
      { status: 404 },
    );
  }

  if (project.ownerId !== user.id) {
    return NextResponse.json(
      { ok: false, error: "Only the project owner can invite members." },
      { status: 403 },
    );
  }

  let payload: MemberPayload | null = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const email = typeof payload?.email === "string"
    ? payload.email.trim().toLowerCase()
    : "";

  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Member email is required." },
      { status: 400 },
    );
  }

  if (project.owner.email.toLowerCase() === email) {
    return NextResponse.json(
      { ok: false, error: "The project owner already has access." },
      { status: 409 },
    );
  }

  const memberUser = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!memberUser) {
    return NextResponse.json(
      { ok: false, error: "No user found with that email." },
      { status: 404 },
    );
  }

  if (project.members.some((member) => member.userId === memberUser.id)) {
    return NextResponse.json(
      { ok: false, error: "That user is already on this project." },
      { status: 409 },
    );
  }

  const membership = await prisma.membership.create({
    data: {
      projectId,
      userId: memberUser.id,
      role: "MEMBER",
    },
    select: {
      id: true,
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  await Promise.all([
    invalidateProjectsForUser(user.id),
    invalidateProjectsForUser(memberUser.id),
  ]);

  return NextResponse.json(
    {
      ok: true,
      member: {
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
      },
    },
    { status: 201 },
  );
}
