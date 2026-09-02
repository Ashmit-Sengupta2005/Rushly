import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

export const createPrismaClient = () => {
  // Create a pg connection pool
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // Pass the pool to the adapter
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};
