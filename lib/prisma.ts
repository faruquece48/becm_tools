import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const PRISMA_SCHEMA_VERSION = 5;
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaSchemaVersion?: number };

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;
  return connectionString && /^postgres(ql)?:\/\//.test(connectionString) ? connectionString : null;
}

function createPrismaClient(connectionString: string) {
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

export function getPrisma() {
  const connectionString = getConnectionString();
  if (!connectionString) return null;

  const existingClient = globalForPrisma.prisma as unknown as Record<string, unknown> | undefined;
  const hasRequiredDelegates = Boolean(
    existingClient?.studentBillPayment
    && existingClient?.rentalBook
    && existingClient?.rentalOrder
    && existingClient?.teacherRentalRecord
    && existingClient?.teacherRentalItem
    && existingClient?.portalAccount
    && existingClient?.studentProfile
    && existingClient?.staffRemunerationStore
    && existingClient?.teacherRankStore
    && existingClient?.teacherCustomizationStore
    && existingClient?.tabulatorStore
    && existingClient?.examCommitteeStore
    && existingClient?.resultSectionStore
  );
  if (!globalForPrisma.prisma || !hasRequiredDelegates || globalForPrisma.prismaSchemaVersion !== PRISMA_SCHEMA_VERSION) {
    globalForPrisma.prisma = createPrismaClient(connectionString);
    globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
  }

  return globalForPrisma.prisma;
}

if (process.env.NODE_ENV !== "production" && globalForPrisma.prisma) {
  globalForPrisma.prisma = globalForPrisma.prisma;
}
