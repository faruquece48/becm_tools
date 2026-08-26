UPDATE "RentalOrder" AS rental
SET "status" = 'ACTIVE',
    "returnedAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE rental."status" = 'RETURNED'
  AND EXISTS (
    SELECT 1
    FROM "RentalOrderItem" AS item
    WHERE item."orderId" = rental."id"
      AND item."returnedAt" IS NULL
  );
