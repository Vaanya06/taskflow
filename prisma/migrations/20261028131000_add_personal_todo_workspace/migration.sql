CREATE TYPE "TodoRepeat" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

CREATE TABLE "TodoList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isInbox" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "inboxOwnerId" TEXT,
    CONSTRAINT "TodoList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TodoListMembership" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "TodoListMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TodoTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "important" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "reminderAt" TIMESTAMP(3),
    "repeat" "TodoRepeat",
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "TodoTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TodoTaskStep" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,
    CONSTRAINT "TodoTaskStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TodoMyDayEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    CONSTRAINT "TodoMyDayEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TodoList_ownerId_idx" ON "TodoList"("ownerId");
CREATE UNIQUE INDEX "TodoList_inboxOwnerId_key" ON "TodoList"("inboxOwnerId");
CREATE UNIQUE INDEX "TodoListMembership_listId_userId_key" ON "TodoListMembership"("listId", "userId");
CREATE INDEX "TodoListMembership_userId_idx" ON "TodoListMembership"("userId");
CREATE INDEX "TodoTask_listId_dueDate_idx" ON "TodoTask"("listId", "dueDate");
CREATE INDEX "TodoTask_listId_isCompleted_idx" ON "TodoTask"("listId", "isCompleted");
CREATE INDEX "TodoTaskStep_taskId_idx" ON "TodoTaskStep"("taskId");
CREATE UNIQUE INDEX "TodoMyDayEntry_userId_taskId_key" ON "TodoMyDayEntry"("userId", "taskId");
CREATE INDEX "TodoMyDayEntry_userId_date_idx" ON "TodoMyDayEntry"("userId", "date");
CREATE INDEX "TodoMyDayEntry_taskId_idx" ON "TodoMyDayEntry"("taskId");

ALTER TABLE "TodoList" ADD CONSTRAINT "TodoList_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TodoList" ADD CONSTRAINT "TodoList_inboxOwnerId_fkey"
FOREIGN KEY ("inboxOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TodoListMembership" ADD CONSTRAINT "TodoListMembership_listId_fkey"
FOREIGN KEY ("listId") REFERENCES "TodoList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TodoListMembership" ADD CONSTRAINT "TodoListMembership_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TodoTask" ADD CONSTRAINT "TodoTask_listId_fkey"
FOREIGN KEY ("listId") REFERENCES "TodoList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TodoTask" ADD CONSTRAINT "TodoTask_creatorId_fkey"
FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TodoTaskStep" ADD CONSTRAINT "TodoTaskStep_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "TodoTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TodoMyDayEntry" ADD CONSTRAINT "TodoMyDayEntry_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TodoMyDayEntry" ADD CONSTRAINT "TodoMyDayEntry_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "TodoTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
