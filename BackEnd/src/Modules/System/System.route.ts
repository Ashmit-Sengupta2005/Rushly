import { Router } from 'express';
import { systemController } from './System.controller.js';

const router = Router();

router.get('/health', systemController.health);

export const systemRouter = router;
