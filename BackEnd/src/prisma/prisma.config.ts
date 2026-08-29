import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Creates a PrismaClient instance using the Prisma v7 driver adapter.
 *
 * Prisma v7 requires an explicit driver adapter for direct DB connections.
 * DATABASE_URL is loaded from the environment (via dotenv in .env.ts at startup).
 */
export const createPrismaClient = () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
};
