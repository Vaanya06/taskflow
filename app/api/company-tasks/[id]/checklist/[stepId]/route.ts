import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMPANY_TASK_PROJECT_ID } from "@/services/company-tasks";

type RouteContext = { params: Promise<{ id: string; stepId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (user.role === UserRole.ADMIN) {
    return NextResponse.json({ ok: false, error: "Only the assigned employee can update checklist progress." }, { status: 403 });
  }

  let payload: { isCompleted?: unknown } | null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  if (typeof payload?.isCompleted !== "boolean" || Object.keys(payload).length !== 1) {
    return NextResponse.json({ ok: false, error: "Choose whether this checklist item is complete." }, { status: 400 });
  }

  const { id, stepId } = await params;
  const result = await prisma.$transaction(async (transaction) => {
    const task = await transaction.task.findFirst({
      where: { id, projectId: COMPANY_TASK_PROJECT_ID, assigneeId: user.id },
      select: { id: true },
    });
    if (!task) return null;

    const updated = await transaction.companyTaskChecklistItem.updateMany({
      where: { id: stepId, taskId: task.id },
      data: { isCompleted: payload.isCompleted as boolean },
    });
    if (!updated.count) return null;

    return transaction.companyTaskChecklistItem.findUnique({
      where: { id: stepId },
      select: { id: true, title: true, isCompleted: true, position: true },
    });
  });

  if (!result) {
    return NextResponse.json({ ok: false, error: "Task or checklist item not found, or access denied." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, item: result });
}
