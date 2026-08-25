import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

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

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient(connectionString);
  }

  return globalForPrisma.prisma;
}

if (process.env.NODE_ENV !== "production" && globalForPrisma.prisma) {
  globalForPrisma.prisma = globalForPrisma.prisma;
}
