import { Router } from 'express';
import { systemController } from './System.controller.js';

const router = Router();

router.get('/health', systemController.health);
// Keep-alive target for uptime pingers (UptimeRobot etc). Deliberately touches
// neither Postgres nor Redis: pinging /health every few minutes would keep the
// Neon compute awake 24/7 and burn the free-tier hours + Upstash commands.
router.get('/ping', (_req, res) => {
  res.type('text/plain').send('pong');
});

export const systemRouter = router;
