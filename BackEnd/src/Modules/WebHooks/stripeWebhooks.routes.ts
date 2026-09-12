import { Router } from 'express';
import { stripeWebhookController } from './stripeWebhooks.controllers.js';

export const stripeWebhookRouter = Router();

// No auth middleware here — Stripe authenticates via signature, not JWT.
// The signature verification IS the authentication.
stripeWebhookRouter.post('/', stripeWebhookController.handle);