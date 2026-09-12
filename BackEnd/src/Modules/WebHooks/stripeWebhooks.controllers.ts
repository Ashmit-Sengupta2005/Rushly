import type {Request,Response} from 'express';
import type Stripe from 'stripe';
import { stripe } from '../../config/stripe.js';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/.env.js';
import { logger } from '../../utils/logger.js';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { stripeWebhookService } from './stripeWebhooks.service.js';

export const stripeWebhookController={
    /**
   * The webhook endpoint. Notice:
   * - NO asyncHandler wrapper — we handle errors ourselves because we need
   *   VERY specific error responses that don't go through the standard errorHandler.
   *   Stripe expects 200 for "handled" and non-200 for "please retry."
   * - The body is Buffer, not parsed JSON — the raw body middleware is applied
   *   in app.ts for this specific route.
   */
  handle:async(req:Request,res:Response)=>{
    // ========================================================
    // Step 1: Verify signature
    // ========================================================
    // stripe.webhooks.constructEvent throws if signature is invalid.
    // Return 400 (NOT 500) so Stripe doesn't retry — bad signatures are
    // permanent failures, not transient errors.
    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      logger.warn('Webhook received without signature header');
      return res.status(400).send('Missing stripe-signature header');
    }
    let event:Stripe.Event;
    try{
        event = stripe.webhooks.constructEvent(
        req.body,                      // MUST be raw Buffer, not parsed
        signature,
        env.STRIPE_WEBHOOK_SECRET,);
    }
    catch(err){
        logger.warn(
        { err: (err as Error).message },
        'Webhook signature verification failed',
      );
      return res.status(400).send('Invalid signature');
    }
    // ========================================================
    // Step 2: Idempotency check
    // ========================================================
    // Try to insert a row with this event's ID as primary key. If it already
    // exists, Prisma throws P2002 (unique constraint) and we know we've seen
    // this event before. Return 200 immediately — Stripe considers this "handled."
    //
    // The insert-first pattern (vs check-then-insert) avoids race conditions
    // where two concurrent copies of the same event both pass the check and
    // both process. Only one INSERT can win.
    try{
        await prisma.processedWebhookEvent.create({
            data:{
                stripeEventId:event.id,
                type:event.type,
                status:'processing',
            },
        });
    }
    catch(err){
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
        logger.info({ eventId: event.id, type: event.type }, 'Duplicate webhook ignored');
        return res.status(200).send('Already processed');
      }
      // Some other DB error — return 500 so Stripe retries
      logger.error({ err, eventId: event.id }, 'Failed to record webhook event');
      return res.status(500).send('Internal error');
    }
    // ========================================================
    // Step 3: Route to the right handler based on event.type
    // ========================================================
    // Wrap in try/catch so a handler crash doesn't leave the ProcessedWebhookEvent
    // in 'processing' state forever. On error, mark as 'failed' with the error.
    try{
        switch(event.type){
            case 'payment_intent.succeeded':
                await stripeWebhookService.handlePaymentSucceeded(
                event.data.object as Stripe.PaymentIntent,);
                break;
            case 'payment_intent.payment_failed':
                await stripeWebhookService.handlePaymentFailed(
                event.data.object as Stripe.PaymentIntent,);
                break;
            case 'charge.refunded':
                await stripeWebhookService.handleChargeRefunded(
                event.data.object as Stripe.Charge,);
                break;
            default:
          // Unhandled event type — log and continue. Stripe sends many event
          // types we don't care about (customer.created, price.updated, etc.).
          logger.debug({ type: event.type }, 'Unhandled webhook event type');
        }
        // Success — mark as done
        await prisma.processedWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: { status: 'done' },
      });

      return res.status(200).send('OK');
    }
    catch(err){
        logger.error({ err, eventId: event.id, type: event.type }, 'Webhook handler failed');
      // Mark as failed but keep the row — this prevents an infinite retry loop
      // from Stripe. If we returned 500, Stripe would retry, and if the handler
      // crashes deterministically, we'd get stuck. Marking as failed and
      // returning 200 acknowledges "we saw it, but we couldn't process it."
      //
      // In production you'd have alerting on failed webhook events and manual
      // reprocessing tools. For Rushly, this is enough.
        await prisma.processedWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: {
          status: 'failed',
          errorMessage: (err as Error).message,
        },
      });
      // Return 200 — we've acknowledged and recorded the failure
      return res.status(200).send('Handler failed but recorded');
    }
  },
};