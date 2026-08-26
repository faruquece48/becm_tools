CREATE TABLE "TeacherRentalRecord" (
  "id" TEXT NOT NULL,
  "teacherName" TEXT NOT NULL,
  "teacherEmail" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueAt" TIMESTAMP(3),
  "returnedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherRentalRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherRentalItem" (
  "id" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "returnedAt" TIMESTAMP(3),
  CONSTRAINT "TeacherRentalItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeacherRentalRecord_teacherName_idx" ON "TeacherRentalRecord"("teacherName");
CREATE INDEX "TeacherRentalRecord_teacherEmail_idx" ON "TeacherRentalRecord"("teacherEmail");
CREATE INDEX "TeacherRentalRecord_status_idx" ON "TeacherRentalRecord"("status");
CREATE INDEX "TeacherRentalItem_bookId_idx" ON "TeacherRentalItem"("bookId");
CREATE INDEX "TeacherRentalItem_returnedAt_idx" ON "TeacherRentalItem"("returnedAt");
CREATE UNIQUE INDEX "TeacherRentalItem_recordId_bookId_key" ON "TeacherRentalItem"("recordId", "bookId");
ALTER TABLE "TeacherRentalItem" ADD CONSTRAINT "TeacherRentalItem_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "TeacherRentalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherRentalItem" ADD CONSTRAINT "TeacherRentalItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "RentalBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
