ALTER TABLE "StudentBillPayment"
ADD COLUMN "letterOfAttestation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "equivalentCertificate" BOOLEAN NOT NULL DEFAULT false;
