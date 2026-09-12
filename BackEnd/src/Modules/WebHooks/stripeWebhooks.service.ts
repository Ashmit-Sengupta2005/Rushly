import type Stripe from "stripe";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../utils/logger.js";
import { consumeHold,releaseStock } from "../CheckOut/Inventory.redis.js";

export const stripeWebhookService={
    /**
   * Process a payment_intent.succeeded event.
   *
   * Idempotency: this method may be called multiple times for the same event
   * (Stripe's at-least-once delivery). We rely on TWO layers of dedup:
   *   1. The ProcessedWebhookEvent unique constraint (checked before this runs)
   *   2. Reservation.status check — if already PAID, we no-op
   *
   * Both are needed. Layer 1 handles same-event retries. Layer 2 handles the
   * edge case where two DIFFERENT events reference the same reservation (rare
   * but possible with manual intervention in the Stripe dashboard).
   */
  async handlePaymentSucceeded(intent:Stripe.PaymentIntent){
    const reservationId=intent.metadata.reservationId;
    if(!reservationId){
        logger.error({ intentId: intent.id }, 'PaymentIntent missing reservationId metadata');
        return;}
    // Load reservation with items — we need the holdIds to consume, and
    // the priceSnapshots to construct the Order.
      const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                images: { orderBy: { position: 'asc' }, take: 1 },
              },
            },
          },
        },
      },
    });
    if (!reservation) {
      logger.error({ reservationId, intentId: intent.id }, 'Reservation not found for succeeded payment');
      // This is bad — we've been paid but have no reservation to link to.
      // In production we'd alert on this. For Rushly, log and move on.
      return;
    }
    // Idempotency layer 2 — if we've already processed this reservation,
    // don't create a duplicate order.
    if (reservation.status === 'PAID') {
      logger.info({ reservationId }, 'Reservation already PAID, no-op');
      return;
    }
     if (reservation.status !== 'PENDING') {
      logger.warn(
        { reservationId, status: reservation.status },
        'Payment succeeded but reservation is not PENDING',
      );
      // Weird state — maybe expired between payment and webhook. Log; don't create order.
      // In production, this would trigger an automatic refund.
      return;
    }
        // ========================================================
    // THE ATOMIC TRANSACTION — this is the core of 4B
    // ========================================================
    // We create the Order, order items, status history entry, and outbox event
    // in ONE Postgres transaction. Either all commit or none do. This prevents
    // partial state like "order exists but no confirmation email was queued."
    const totalAmount = reservation.items.reduce(
      (sum, item) => sum + item.priceSnapshot * item.quantity,
      0,);
    await prisma.$transaction(async(tx)=>{
        //1.Create the Order
        const order= await tx.order.create({
            data:{
                userId:reservation.userId,
                reservationId:reservation.id,
                status:'PAID',
                totalAmount,
                currency:'INR',
                stripePaymentIntentId:intent.id,
                items:{
                    create:reservation.items.map((item)=>({
                        productId:item.productId,
                        quantity:item.quantity,
                        priceSnapshot:item.priceSnapshot,
                        productNameSnapshot:item.product.name,
                        productImageSnapshot:item.product.images[0]?.url ?? null,
                    })),
                },
            },
        });
         // 2. Record the state transition
         await tx.orderStatusHistory.create({
            data:{
                orderId:order.id,
                fromStatus:null,
                toStatus:'PAID',
                reason:"Payment Succeeded via Stripe",
                changedBy:'System',
            },
         });
         // 3. Enqueue the confirmation email in the outbox
         // (Step 5 will build the worker that reads from this table)
         await tx.outboxEvent.create({
            data:{
                type:'order_confirmation',
                payload:{
                    orderId:order.id,
                    userId:reservation.userId,
                    totalAmount,
                    itemCount:reservation.items.length
                },
            status:'PENDING'},
         });
         //4. Transition the reservation to Paid
         await tx.reservation.update({
            where:{id:reservation.id},
            data:{status:"PAID"},
         });
    });
     // ========================================================
    // Post-transaction: clean up Redis
    // ========================================================
    // Consume the holds — this deletes the hold keys so no future release
    // call can inflate stock back. Stock STAYS decremented (the sale happened).
    // This is intentionally OUTSIDE the transaction because Redis isn't
    // transactional with Postgres. If this fails, we log and move on — the
    // hold keys will expire naturally via TTL, at which point the release
    // logic checks the reservation status and won't refund a paid one.
    for(const item of reservation.items){
        try{
            await consumeHold(item.holdId);
        }
        catch(err){
            logger.error(
                {err,holdId:item.holdId},
                'Failed to consume hold — will expire via TTL, no correctness impact',);
        }
    }
    logger.info({ reservationId, orderId: intent.id }, 'Order created from successful payment');
  },
   /**
   * Process a payment_intent.payment_failed event.
   *
   * The reservation STAYS in PENDING — the user can retry payment on the same
   * reservation until it expires. We do NOT release stock here (letting them
   * try again preserves their hold). We DO log the failure for diagnostics.
   *
   * If they never retry, the BullMQ expiry worker will release the holds at
   * expiresAt. This is the correct behavior.
   */
   handlePaymentFailed(intent:Stripe.PaymentIntent){
    const reservationId=intent.metadata.reservationId;
    if(!reservationId) return;
    logger.warn(
      {
        reservationId,
        intentId: intent.id,
        lastPaymentError: intent.last_payment_error?.message,
      },
      'Payment failed — reservation stays PENDING for retry',);
    // Optional: increment a "failed_attempts" counter, notify user via email, etc.
    // Deferred for now.
  },
  handleChargeRefunded(charge:Stripe.Charge){

  }
};