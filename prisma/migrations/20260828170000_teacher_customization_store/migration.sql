CREATE TABLE "TeacherCustomizationStore" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "preview" JSONB,
    "summary" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeacherCustomizationStore_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeacherCustomizationStore_teacherId_key" ON "TeacherCustomizationStore"("teacherId");