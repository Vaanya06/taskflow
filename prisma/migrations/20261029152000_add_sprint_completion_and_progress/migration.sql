ALTER TABLE "Sprint" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "Sprint" ADD COLUMN "scopeTasks" INTEGER;
ALTER TABLE "Sprint" ADD COLUMN "scopePoints" INTEGER;
ALTER TABLE "Sprint" ADD COLUMN "completedTasks" INTEGER;
ALTER TABLE "Sprint" ADD COLUMN "carriedOverTasks" INTEGER;
ALTER TABLE "Sprint" ADD COLUMN "completedPoints" INTEGER;
ALTER TABLE "Sprint" ADD COLUMN "carriedOverPoints" INTEGER;

ALTER TYPE "ActivityType" ADD VALUE 'SPRINT_COMPLETED';

CREATE TABLE "SprintProgressSnapshot" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "scopeTasks" INTEGER NOT NULL,
    "scopePoints" INTEGER NOT NULL,
    "remainingTasks" INTEGER NOT NULL,
    "remainingPoints" INTEGER NOT NULL,
    CONSTRAINT "SprintProgressSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SprintProgressSnapshot_sprintId_snapshotDate_key" ON "SprintProgressSnapshot"("sprintId", "snapshotDate");

ALTER TABLE "SprintProgressSnapshot" ADD CONSTRAINT "SprintProgressSnapshot_sprintId_fkey"
FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
