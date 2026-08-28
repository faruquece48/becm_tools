ALTER TABLE "PortalAccount"
  ADD COLUMN "passwordResetOtpHash" TEXT,
  ADD COLUMN "passwordResetOtpExpiresAt" TIMESTAMP(3),
  ADD COLUMN "passwordResetOtpAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "passwordResetLastSentAt" TIMESTAMP(3),
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;