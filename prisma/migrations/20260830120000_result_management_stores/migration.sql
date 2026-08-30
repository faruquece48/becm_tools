CREATE TABLE "TabulatorStore" (
  "id" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TabulatorStore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExamCommitteeStore" (
  "id" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExamCommitteeStore_pkey" PRIMARY KEY ("id")
);