CREATE TABLE "StudentBillPayment" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "rentalBookCount" INTEGER NOT NULL DEFAULT 0,
    "labReportOption" TEXT NOT NULL DEFAULT 'none',
    "associationYears" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "validationId" TEXT,
    "bankTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentBillPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentBillPayment_transactionId_key" ON "StudentBillPayment"("transactionId");
CREATE INDEX "StudentBillPayment_email_idx" ON "StudentBillPayment"("email");
CREATE INDEX "StudentBillPayment_status_idx" ON "StudentBillPayment"("status");
CREATE INDEX "StudentBillPayment_createdAt_idx" ON "StudentBillPayment"("createdAt");
