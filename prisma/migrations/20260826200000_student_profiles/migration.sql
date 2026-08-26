CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "roll" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'BECM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudentProfile_email_key" ON "StudentProfile"("email");
CREATE INDEX "StudentProfile_roll_idx" ON "StudentProfile"("roll");
CREATE INDEX "StudentProfile_series_idx" ON "StudentProfile"("series");
