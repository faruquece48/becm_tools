CREATE TABLE "StudentServiceVerification" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "service" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentServiceVerification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudentServiceVerification_codeHash_key" ON "StudentServiceVerification"("codeHash");
CREATE UNIQUE INDEX "StudentServiceVerification_paymentId_service_key" ON "StudentServiceVerification"("paymentId", "service");
CREATE INDEX "StudentServiceVerification_service_verifiedAt_idx" ON "StudentServiceVerification"("service", "verifiedAt");
ALTER TABLE "StudentServiceVerification" ADD CONSTRAINT "StudentServiceVerification_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "StudentBillPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;