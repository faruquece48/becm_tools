CREATE TABLE "TeacherRankStore" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeacherRankStore_pkey" PRIMARY KEY ("id")
);