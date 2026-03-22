-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'consent',
    "currentTask" INTEGER NOT NULL DEFAULT 0,
    "consentedAt" DATETIME,
    "educationYears" INTEGER,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    "memoryWordListId" TEXT,
    CONSTRAINT "Session_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "taskNumber" INTEGER NOT NULL,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "raw" JSONB,
    "events" JSONB,
    "artifacts" JSONB,
    "autoScore" INTEGER,
    "humanScore" INTEGER,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    CONSTRAINT "TaskResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Participant_code_key" ON "Participant"("code");

-- CreateIndex
CREATE INDEX "Participant_code_idx" ON "Participant"("code");

-- CreateIndex
CREATE INDEX "Session_participantId_idx" ON "Session"("participantId");

-- CreateIndex
CREATE INDEX "Session_status_idx" ON "Session"("status");

-- CreateIndex
CREATE INDEX "Session_currentTask_idx" ON "Session"("currentTask");

-- CreateIndex
CREATE UNIQUE INDEX "Session_participantId_id_key" ON "Session"("participantId", "id");

-- CreateIndex
CREATE INDEX "TaskResponse_sessionId_idx" ON "TaskResponse"("sessionId");

-- CreateIndex
CREATE INDEX "TaskResponse_needsReview_idx" ON "TaskResponse"("needsReview");

-- CreateIndex
CREATE INDEX "TaskResponse_taskNumber_idx" ON "TaskResponse"("taskNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TaskResponse_sessionId_taskNumber_key" ON "TaskResponse"("sessionId", "taskNumber");
