ALTER TABLE "RentalOrder"
  ADD COLUMN "activationCodeHash" TEXT,
  ADD COLUMN "activationCodeSentAt" TIMESTAMP(3),
  ADD COLUMN "activatedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "RentalOrder_activationCodeHash_key" ON "RentalOrder"("activationCodeHash");