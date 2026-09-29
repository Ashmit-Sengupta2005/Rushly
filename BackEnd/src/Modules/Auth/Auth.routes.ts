import { registerSchema,loginSchema } from './Auth.schemas.js';
import { Router } from 'express';
import { validate } from '../../utils/validate.js';
import { authController } from './Auth.controller.js';
import { requireAuth } from './Auth.middleware.js';
import { rateLimit } from '../../utils/rateLimiter.js';
export const authRouter = Router();

authRouter.post('/register', rateLimit.auth, validate.body(registerSchema), authController.register);
authRouter.post('/login', rateLimit.auth, validate.body(loginSchema), authController.login);
authRouter.post('/refresh', rateLimit.auth, authController.refresh);            // reads cookie, no body validation
authRouter.post('/logout', requireAuth, authController.logout);
authRouter.get('/me', requireAuth, authController.me);