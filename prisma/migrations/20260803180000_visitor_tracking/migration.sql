-- CreateTable
CREATE TABLE "VisitorSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenDay" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "VisitorSession_lastSeenAt_idx" ON "VisitorSession"("lastSeenAt");

-- CreateIndex
CREATE INDEX "VisitorSession_lastSeenDay_idx" ON "VisitorSession"("lastSeenDay");
