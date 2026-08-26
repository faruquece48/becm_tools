CREATE TABLE "PortalAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loginCount" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PortalAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PortalAccount_email_role_key" ON "PortalAccount"("email", "role");
CREATE INDEX "PortalAccount_role_idx" ON "PortalAccount"("role");
CREATE INDEX "PortalAccount_active_idx" ON "PortalAccount"("active");
CREATE INDEX "PortalAccount_lastLoginAt_idx" ON "PortalAccount"("lastLoginAt");
