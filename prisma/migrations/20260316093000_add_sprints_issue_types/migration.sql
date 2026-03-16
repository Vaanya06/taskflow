-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('EPIC', 'STORY', 'TASK', 'BUG');

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'SPRINT_CREATED';

-- CreateTable
CREATE TABLE "Sprint" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "goal" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Task"
ADD COLUMN "issueType" "IssueType" NOT NULL DEFAULT 'TASK',
ADD COLUMN "sprintId" TEXT,
ADD COLUMN "storyPoints" INTEGER;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
