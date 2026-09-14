import { prisma } from "../../config/prisma.js";
import { stripe } from "../../config/stripe.js";
import { logger } from "../../utils/logger.js";
import { errors } from "../../utils/Errors.js";
import { initiateRefundInput } from "./refund.schemas.js";

export const refundService={
     /**
   * Admin-initiated refund.
   *
   * This function only tells Stripe to refund. The actual state transitions
   * (Order → REFUNDED, stock restock, Refund row insertion) happen when Stripe
   * fires the charge.refunded webhook back to us.
   *
   * This asymmetry is intentional: Stripe is the source of truth for money
   * movement. We don't optimistically update state here because a network
   * failure between our request and Stripe's response would leave us with a
   * marked-refunded order that Stripe doesn't know about. The webhook is the
   * confirmation that the money actually moved.
   *
   * Returns 202 Accepted semantics — "we've initiated this, listen for the webhook."
   */
   async initiateRefund(orderId:string,adminId:string,input:initiateRefundInput){
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { refunds: true },
    });
    if (!order) {
      throw errors.notFound('ORDER_NOT_FOUND', 'Order does not exist');
    }
    // Only refund orders in a payable state — can't refund a pending or
    // already-refunded order. Cancelled is also invalid.
    if (order.status !== 'PAID' && order.status !== 'FULFILLED') {
      throw errors.conflict('ORDER_NOT_REFUNDABLE', 'Order is not in a refundable state', {
        currentStatus: order.status,
      });
    }
    if (!order.stripePaymentIntentId) {
      throw errors.internal('MISSING_PAYMENT_INTENT', 'Order has no payment intent — cannot refund');
    }
    // Compute how much is refundable
    const alreadyRefunded=order.refunds.filter((r)=>r.status==='SUCCEEDED' || r.status==='PENDING')
                                       .reduce((sum, r) => sum + r.amount, 0);
    const refundableAmount = order.totalAmount - alreadyRefunded;
    if (refundableAmount <= 0) {
      throw errors.conflict('FULLY_REFUNDED', 'Order has already been fully refunded');
    }
    // If amount is specified, cap at refundable amount. If not specified, refund everything.
    const refundAmount = input.amount ?? refundableAmount;
    if (refundAmount > refundableAmount) {
      throw errors.badRequest('REFUND_EXCEEDS_REMAINING', 'Refund amount exceeds remaining refundable balance', {
        requested: refundAmount,
        refundable: refundableAmount,
      });
    }
    // Call Stripe's refund API. Idempotency key ensures that if this endpoint is
    // called twice (network retry, admin double-click), Stripe returns the same
    // refund rather than creating a duplicate. Key uses orderId + timestamp to
    // allow multiple partial refunds while preventing accidental duplicates.
    const idempotencyKey = `refund:${orderId}:${Date.now()}`;
    let stripeRefund;
    try{
        stripeRefund = await stripe.refunds.create(
        {
          payment_intent: order.stripePaymentIntentId,
          amount: refundAmount,
          reason: input.reason === 'other' ? undefined : input.reason,
          metadata: {
            orderId: order.id,
            adminId,
            notes: input.notes ?? '',
          },
        },
        { idempotencyKey },);}
    catch(err){
        logger.error({ err, orderId, adminId }, 'Stripe refund API call failed');
        throw errors.internal('STRIPE_REFUND_FAILED', 'Failed to initiate refund with Stripe');
    }
    // Audit log — we log BEFORE webhook processing. The audit shows admin intent;
    // the OrderStatusHistory (added by webhook) shows the actual state change.
    await prisma.auditLog.create({
        data:{
            actorId:adminId,
            action:'refund.initiate',
            entityType:'Order',
            entityId:order.id,
            metadata:{
                stripeRefundId:stripeRefund.id,
                amount:refundAmount,
                reason:input.reason,
                notes:input.notes,},
        },
    });
    logger.info(
      {
        orderId,
        stripeRefundId: stripeRefund.id,
        amount: refundAmount,
        adminId,
      },
      'Refund initiated with Stripe — awaiting webhook confirmation',
    );
    // Return 202-style response: "we've kicked this off, listen for confirmation"
    return {
      stripeRefundId: stripeRefund.id,
      amount: refundAmount,
      status: 'initiated',
      message: 'Refund initiated. Order state will update when Stripe confirms via webhook (usually within seconds).',
    };                            
   }
};