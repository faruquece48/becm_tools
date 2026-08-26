UPDATE "RentalBook"
SET "imageUrl" = REGEXP_REPLACE("imageUrl", '/w[0-9]+-h[0-9]+-c/', '/s0/', 'i'),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "imageUrl" LIKE '%blogger.googleusercontent.com%'
  AND "imageUrl" ~ '/w[0-9]+-h[0-9]+-c/';
