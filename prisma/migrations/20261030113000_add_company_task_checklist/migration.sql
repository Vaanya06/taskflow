CREATE TABLE "CompanyTaskChecklistItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "CompanyTaskChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompanyTaskChecklistItem_taskId_position_idx"
ON "CompanyTaskChecklistItem"("taskId", "position");

ALTER TABLE "CompanyTaskChecklistItem"
ADD CONSTRAINT "CompanyTaskChecklistItem_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
