CREATE TABLE "SummaryWorkspaceStore" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SummaryWorkspaceStore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SummaryWorkspaceStore_teacherId_key" ON "SummaryWorkspaceStore"("teacherId");
