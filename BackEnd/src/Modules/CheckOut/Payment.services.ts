//creating Payment Intents

import { prisma } from "../../config/prisma.js";
import { stripe } from "../../config/stripe.js";
import { errors } from "../../utils/Errors.js";
import { logger } from "../../utils/logger.js";

export const paymentService={
     /**
   * Create (or retrieve) a Stripe PaymentIntent for a reservation.
   * Returns the client_secret which the frontend uses with Stripe.js to
   * collect and confirm card details.
   *
   * Idempotency: if called twice for the same reservation, we return the
   * existing PaymentIntent rather than creating a new one. This matters
   * because the frontend might retry the call, and we don't want duplicate
   * intents floating around.
   */
   async createPaymentIntent(reservationId:string,userId:string){
    // Load reservation, verify ownership, verify it's still payable.
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { items: true },
    });
    if (!reservation || reservation.userId !== userId) {
      throw errors.notFound('RESERVATION_NOT_FOUND');
    }
    if (reservation.status !== 'PENDING') {
      throw errors.conflict('RESERVATION_NOT_PAYABLE', 'Reservation is not in a payable state', {
        currentStatus: reservation.status,
      });
    }
    // Guard: reservation might have expired since we loaded it.
    // Small race window between this check and actually charging, but the
    // BullMQ worker respects PAID status so a race that goes our way is safe.
    if (reservation.expiresAt < new Date()) {
      throw errors.conflict('RESERVATION_EXPIRED', 'Reservation has expired');
    }
    // Compute amount server-side from the persisted priceSnapshots.
    // Even if product prices changed since reservation, we honor the price
    // the user saw when they reserved.
    const totalAmount=reservation.items.reduce((sum,item)=>sum+item.priceSnapshot*item.quantity,0,);
    // Check if we've already created an intent for this reservation.
    // We store the payment intent id on Reservation via a Postgres column,
    // OR we can look it up in Stripe by metadata. We'll add a field.
    if(reservation.stripePaymentIntentId){
        // Retrieve the existing intent from Stripe. Its client_secret is
      // still usable if the intent hasn't succeeded or been cancelled.
      try{
          const existing = await stripe.paymentIntents.retrieve(
          reservation.stripePaymentIntentId,);
          if (
          existing.status === 'requires_payment_method' ||
          existing.status === 'requires_confirmation' ||
          existing.status === 'requires_action'){
            return {
                paymentIntentId:existing.id,
                clientSecret:existing.client_secret!,
                amount:existing.amount,
            };}
          // If it's succeeded, processing, or cancelled, fall through to create a new one. 
      }
      catch(err){
          logger.warn(
          { err, reservationId, intentId: reservation.stripePaymentIntentId },
          'Failed to retrieve existing PaymentIntent, creating new one',
        );
      }
    }
    // Create a new PaymentIntent. Notice the `metadata` — this is how the
    // webhook handler will know which reservation this payment belongs to.
    // Also notice `idempotencyKey` — Stripe's own dedup on the create call,
    // in case this endpoint gets called twice with retries.
    const intent=await stripe.paymentIntents.create({
        amount:totalAmount,// in paise — same unit we store
        currency:'inr',
        // Automatic payment methods = Stripe picks card/UPI/etc based on availability
        automatic_payment_methods:{enabled:true},
        metadata:{
            reservationId:reservation.id,
            userId:reservation.userId,
        },
        description:`Rushly order - reservation ${reservation.id}`,
    },
    {
        // Stripe's own idempotency: if this request is retried with the same key,
        // Stripe returns the original response instead of creating a duplicate.
        // We use reservationId as the key — one PaymentIntent per reservation.
        idempotencyKey:`payment-intent:${reservation.id}`,
    });
    // Persist the intent ID on the reservation so we can look it up later.
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { stripePaymentIntentId: intent.id },
    });

    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret!,
      amount: intent.amount,
    };
   }
}