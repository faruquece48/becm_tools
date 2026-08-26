WITH ranked_books AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY LOWER(TRIM("title")), LOWER(TRIM("author")), LOWER(TRIM(COALESCE("edition", ''))), LOWER(TRIM(COALESCE("publication", '')))
    ORDER BY "createdAt" ASC, "id" ASC
  ) AS duplicate_rank
  FROM "RentalBook"
  WHERE "active" = true
)
UPDATE "RentalBook"
SET "active" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (SELECT "id" FROM ranked_books WHERE duplicate_rank > 1);

CREATE UNIQUE INDEX "RentalBook_active_identity_key"
ON "RentalBook" (
  LOWER(TRIM("title")),
  LOWER(TRIM("author")),
  LOWER(TRIM(COALESCE("edition", ''))),
  LOWER(TRIM(COALESCE("publication", '')))
)
WHERE "active" = true;
