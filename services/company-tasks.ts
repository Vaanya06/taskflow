import { prisma } from "@/lib/prisma";

export const COMPANY_TASK_PROJECT_ID = "company-task-tracker";

export async function ensureCompanyTaskProject(ownerId: string) {
  return prisma.project.upsert({
    where: { id: COMPANY_TASK_PROJECT_ID },
    create: {
      id: COMPANY_TASK_PROJECT_ID,
      title: "Company Tasks",
      description: "Shared company task assignment and tracking.",
      ownerId,
    },
    update: {},
    select: { id: true },
  });
}
