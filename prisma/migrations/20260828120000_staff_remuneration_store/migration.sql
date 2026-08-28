CREATE TABLE "StaffRemunerationStore" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffRemunerationStore_pkey" PRIMARY KEY ("id")
);