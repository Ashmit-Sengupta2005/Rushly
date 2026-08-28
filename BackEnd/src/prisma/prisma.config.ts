import { PrismaClient } from "@prisma/client";
import path from "path";
import { config as dotenvConfig } from "dotenv";

// Load environment variables from .env at project root
dotenvConfig({ path: path.resolve(process.cwd(), ".env") });

/**
 * Creates a PrismaClient instance with the datasource URL supplied
 * via the environment variable `DATABASE_URL`.
 *
 * If you switch to Prisma Accelerate, replace the `datasources` option
 * with `{ accelerateUrl: process.env.PRISMA_ACCELERATE_URL }`.
 */
export const createPrismaClient = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not defined in the environment");
  }
  return new PrismaClient({
    datasources: { db: { url } },
  });
};
