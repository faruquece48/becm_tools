CREATE TABLE "ResultSectionStore" (
  "section" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResultSectionStore_pkey" PRIMARY KEY ("section")
);