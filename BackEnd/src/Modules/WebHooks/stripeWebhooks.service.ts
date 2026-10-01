import type Stripe from "stripe";
import { stripe } from "../../config/stripe.js";
import { prisma } from "../../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { logger } from "../../utils/logger.js";
import { consumeHold, syncProductStock } from "../CheckOut/Inventory.redis.js";
export const stripeWebhookService = {
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
  async handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
    const reservationId = intent.metadata.reservationId;
    if (!reservationId) {
      logger.error({ intentId: intent.id }, 'PaymentIntent missing reservationId metadata');
      return;
    }
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
      // The payment landed after the hold ended — EXPIRED (paid at the last
      // second / slow 3-D Secure) or CANCELLED (user cancelled in another tab).
      // The held stock was already released, so there is nothing to fulfil and
      // no order is created. Refund in full rather than keep the money.
      logger.warn(
        { reservationId, status: reservation.status, intentId: intent.id },
        'Payment succeeded but reservation is not PENDING — auto-refunding',
      );
      try {
        const refund = await stripe.refunds.create(
          {
            payment_intent: intent.id,
            metadata: { reservationId, reason: `reservation_${reservation.status.toLowerCase()}` },
          },
          // Keyed on the intent: a duplicate event for the same payment can
          // never produce a second refund.
          { idempotencyKey: `late-payment-refund:${intent.id}` },
        );
        logger.info({ reservationId, intentId: intent.id, refundId: refund.id }, 'Late payment refunded');
      } catch (err) {
        // The controller marks this event 'failed' and returns 200 (no Stripe
        // retry), so this log is the only signal — make it impossible to miss.
        logger.error(
          { err, reservationId, intentId: intent.id, amount: intent.amount },
          'AUTO-REFUND FAILED for late payment — refund manually in the Stripe dashboard',
        );
        throw err;
      }
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
    await prisma.$transaction(async (tx) => {
      //1.Create the Order
      const order = await tx.order.create({
        data: {
          userId: reservation.userId,
          reservationId: reservation.id,
          status: 'PAID',
          totalAmount,
          currency: 'INR',
          stripePaymentIntentId: intent.id,
          // Copy the checkout-time snapshot. Prisma needs DbNull (not plain null)
          // for an empty optional Json column — e.g. reservations created before
          // addresses existed.
          shippingAddress: reservation.shippingAddress ?? Prisma.DbNull,
          items: {
            create: reservation.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceSnapshot: item.priceSnapshot,
              productNameSnapshot: item.product.name,
              productImageSnapshot: item.product.images[0]?.url ?? null,
            })),
          },
        },
      });
      // 2. Record the state transition
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: null,
          toStatus: 'PAID',
          reason: "Payment Succeeded via Stripe",
          changedBy: 'System',
        },
      });
      // 3. Enqueue the confirmation email in the outbox
      // (Step 5 will build the worker that reads from this table)
      await tx.outboxEvent.create({
        data: {
          type: 'order_confirmation',
          payload: {
            orderId: order.id,
            userId: reservation.userId,
            totalAmount,
            itemCount: reservation.items.length
          },
          status: 'PENDING'
        },
      });
      //4. Transition the reservation to Paid
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: "PAID" },
      });
      // 5. Persist the stock decrement to Postgres — Redis already decremented
      // the live counter at reservation time (Inventory.redis.ts RESERVE_SCRIPT),
      // but that's ephemeral. Without this, Postgres availableStock never moves,
      // and initRedisInventory() reseeds Redis FROM Postgres on every boot,
      // silently undoing every sale's decrement on restart.
      for (const item of reservation.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            availableStock: { decrement: item.quantity },
            version: { increment: 1 },
          },
        });
      }
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
    for (const item of reservation.items) {
      try {
        await consumeHold(item.holdId);
      }
      catch (err) {
        logger.error(
          { err, holdId: item.holdId },
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
  handlePaymentFailed(intent: Stripe.PaymentIntent) {
    const reservationId = intent.metadata.reservationId;
    if (!reservationId) return;
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
  /**
    * Process a charge.refunded event.
    *
    * Symmetric to handlePaymentSucceeded but in reverse:
    * - Transition Order to REFUNDED
    * - Increment stock in Postgres (defer to admin action for how much Redis reflects)
    * - Sync Redis stock to match Postgres
    * - Insert Refund row (idempotency via unique stripeRefundId)
    * - Enqueue refund confirmation email via OutboxEvent
    *
    * Idempotency: charge.refunded fires once per refund action. If it retries,
    * our layers catch it: ProcessedWebhookEvent dedupes at the outer layer,
    * and the Refund.stripeRefundId unique constraint catches at the inner layer
    * even if webhook dedup somehow missed.
    *
    * Handles partial refunds: Stripe's charge.refunded fires for each refund,
    * whether full or partial. We record each one; the order transitions to
    * REFUNDED only when the total refunded equals the order total.
    */
  async handleChargeRefunded(charge: Stripe.Charge) {
    // Charge might not have a payment_intent if it's a direct charge (pre-2019 API);
    // we always use PaymentIntents, so this should always be set.
    const paymentIntentId = typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;
    if (!paymentIntentId) {
      logger.error(
        { chargeId: charge.id },
        'charge.refunded webhook received without payment_intent — cannot link to order',
      );
      return;
    }
    // Find the order via the payment intent ID that we stored on it
    const order = await prisma.order.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      include: {
        items: true,
        refunds: true,
      },
    });
    if (!order) {
      logger.error(
        { chargeId: charge.id, paymentIntentId },
        'charge.refunded webhook — no order found for payment intent',
      );
      return;
    }
    // Stripe's `charge.refunded` event carries a SNAPSHOT of the charge taken
    // when the event was generated. That snapshot doesn't reliably include an
    // expanded `refunds.data` list — depending on timing/API version, it can
    // arrive empty even though the refund genuinely exists on the charge. The
    // webhook payload is a notification ("something changed"), not a
    // guaranteed-fresh copy of the object — so when it's empty, we re-fetch
    // the charge directly from the API with refunds expanded, which IS
    // authoritative, instead of trusting the possibly-stale embedded copy.
    //
    // For partial refunds, multiple charge.refunded events may fire over time,
    // each with a new Refund in the list. The `Refund.stripeRefundId` unique
    // constraint prevents us from double-recording any single one.
    let stripeRefunds=charge.refunds?.data ?? [];
    if(stripeRefunds.length===0){
      const freshCharge=await stripe.charges.retrieve(charge.id,{expand:['refunds']});
      stripeRefunds=freshCharge.refunds?.data ?? [];
    }
    if(stripeRefunds.length===0){
      logger.warn(
      { chargeId: charge.id, orderId: order.id },
      'charge.refunded fired but charge has no refunds attached',);
      return;}
    // Find refunds we haven't recorded yet...data is an array of refund objects
    const recordedRefundIds=new Set(order.refunds.map((r)=>r.stripeRefundId))
    const newRefunds=stripeRefunds.filter((r)=>!recordedRefundIds.has(r.id));
    if(newRefunds.length===0){
      logger.info(
      { chargeId: charge.id, orderId: order.id },
      'charge.refunded — all refunds already recorded, no-op',);
      return;}
    // Process each new refund in one transaction so partial commits can't happen
    await prisma.$transaction(async(tx)=>{
      for(const stripeRefund of newRefunds){
        // Insert Refund row. Unique constraint on stripeRefundId is the ultimate
       // dedup safety net — if somehow the same refund is seen twice, this throws.
       await tx.refund.create({
        data:{
          orderId:order.id,
          stripeRefundId:stripeRefund.id,
          amount:stripeRefund.amount,
          reason:stripeRefund.reason??"No Reason Provided",
          status:stripeRefund.status==='succeeded'?'SUCCEEDED':'PENDING',},
        });}
       // Compute total refunded so far (existing + new)
       const totalRefunded=
        order.refunds.reduce((sum,r)=>sum+r.amount,0)
        +newRefunds.reduce((sum,r)=>sum+r.amount,0);
       // Full refund: total refunded equals order total. Transition to REFUNDED.
       const isFullRefunded=totalRefunded>=order.totalAmount;
       if(isFullRefunded && order.status!=='REFUNDED'){
          //Transition Order State
          await tx.order.update({
             where:{id:order.id},
             data:{status:'REFUNDED'},
          });
          //Audit Trail
          await tx.orderStatusHistory.create({
            data:{
              orderId:order.id,
              fromStatus:order.status,
              toStatus:'REFUNDED',
              reason:`Refunded via Stripe webhook (chargeId=${charge.id})`,
              changedBy:'system',},
          });
      // Restore stock — only on full refund. Partial refunds don't restore stock
      // because we don't know which specific units of the order are being refunded.
      // Real production would ask admin to specify per-item, but for Rushly the
      // simplification is: full refund = full restock; partial refund = money only
       for(const item of order.items){
        // Only availableStock — the sale never touched totalStock (it's the
        // lifetime-received ceiling, only admin restocks move it), so undoing
        // the sale shouldn't inflate it either.
        await tx.inventory.update({
          where:{productId:item.productId},
          data:{
            availableStock:{increment:item.quantity},
            version:{increment:1},},
        });
       }
       //Enqueue the refund confirmation mail
       await tx.outboxEvent.create({
        data:{
          type:'refund_confirmation',
          payload:{
            orderId:order.id,
            userId:order.userId,
            totalRefunded,
            currency:order.currency,},
        status:"PENDING",}
       });
       }
      else if(!isFullRefunded){
        // Partial refund — record it in history but don't change order state.
        // The order stays PAID (or FULFILLED); refunds are tracked in the Refund table.
        await tx.orderStatusHistory.create({
          data:{
            orderId:order.id,
            fromStatus:order.status,
            toStatus:order.status, // no state transition
            reason: `Partial refund: ${newRefunds.map((r) => `${r.id}=${r.amount}`).join(', ')}`,
            changedBy:'system',},
        });
      } 
      });
    // ==========================================================
    // Post-transaction: sync Redis stock (only if we restocked)
   // ==========================================================
   // Redis sync happens outside the transaction because Redis isn't
   // transactional with Postgres. If sync fails, boot reseed catches it.
   const totalRefunded=order.refunds.reduce((sum,r)=>sum+r.amount,0)+
                        newRefunds.reduce((sum,r)=>sum+r.amount,0);
   if(totalRefunded>=order.totalAmount){
    for(const item of order.items){
      try{
        await syncProductStock(item.productId);}
      catch(err){
        logger.error(
          { err, productId: item.productId },
          'Redis sync failed after refund — boot reseed will correct',);}
    }}
    logger.info(
    {
      orderId: order.id,
      chargeId: charge.id,
      newRefundsCount: newRefunds.length,
      isFullRefund: totalRefunded >= order.totalAmount,
    },
    'Refund processed',);}
};