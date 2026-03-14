import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type LabelPayload = {
  labelId?: string;
  name?: string;
  color?: string | null;
};

function normalizeColor(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const hex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }

  return hex.toLowerCase();
}

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

  const { id: taskId } = await params;
  if (!taskId) {
    return NextResponse.json(
      { ok: false, error: "Task id is required." },
      { status: 400 },
    );
  }

  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    select: {
      id: true,
      project: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!task || task.project.ownerId !== user.id) {
    return NextResponse.json(
      { ok: false, error: "Task not found." },
      { status: 404 },
    );
  }

  let payload: LabelPayload | null = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const labelId =
    typeof payload?.labelId === "string" ? payload.labelId.trim() : "";
  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  const color = normalizeColor(payload?.color ?? null);

  let label = null as null | { id: string; name: string; color: string | null };

  if (labelId) {
    label = await prisma.label.findUnique({
      where: {
        id: labelId,
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });

    if (!label) {
      return NextResponse.json(
        { ok: false, error: "Label not found." },
        { status: 404 },
      );
    }
  } else {
    if (name.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Label name must be at least 2 characters." },
        { status: 400 },
      );
    }

    label = await prisma.label.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });

    if (!label) {
      label = await prisma.label.create({
        data: {
          name,
          color,
        },
        select: {
          id: true,
          name: true,
          color: true,
        },
      });
    }
  }

  try {
    await prisma.taskLabel.create({
      data: {
        taskId,
        labelId: label.id,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code !== "P2002") {
        throw error;
      }
    }
  }

  return NextResponse.json({ ok: true, label });
}
