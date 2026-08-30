import { prisma } from './prisma.js';
import { logger } from '../utils/logger.js';

export async function connectDb() {
  // Prisma connects lazily on first query, but we ping here to fail fast
  // at boot rather than at first request if the DB is unreachable.
  await prisma.$queryRaw`SELECT 1`;
  logger.info('✅ PostgreSQL connected');
}

export async function disconnectDb() {
  await prisma.$disconnect();
}