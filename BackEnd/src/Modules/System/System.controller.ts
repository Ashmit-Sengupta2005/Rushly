import type { Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';
import { redis } from '../../config/redis.js';

export const systemController = {
  health: async (_req: Request, res: Response) => {
    let dbOk = false;
    let redisOk = false;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      // Database is unavailable
    }

    try {
      redisOk = (await redis.ping()) === 'PONG';
    } catch {
      // Redis is unavailable
    }

    const isHealthy = dbOk && redisOk;

    return res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'degraded',
      postgres: dbOk ? 'up' : 'down',
      redis: redisOk ? 'up' : 'down',
    });
  },
};
