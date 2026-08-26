ALTER TABLE "RentalOrderItem" ADD COLUMN "returnedAt" TIMESTAMP(3);

UPDATE "RentalOrderItem" AS item
SET "returnedAt" = COALESCE("RentalOrder"."returnedAt", "RentalOrder"."updatedAt")
FROM "RentalOrder"
WHERE item."orderId" = "RentalOrder"."id"
  AND "RentalOrder"."status" = 'RETURNED';

CREATE INDEX "RentalOrderItem_returnedAt_idx" ON "RentalOrderItem"("returnedAt");
