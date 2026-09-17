//! HEART OF RUSHLY

import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma.js";
import { errors } from "../../utils/Errors.js";
import { logger } from "../../utils/logger.js";
import { env } from "../../config/.env.js";
import { reservationExpiryQueue } from "../../config/queues.js";
import { reserveStock,releaseStock } from "./Inventory.redis.js";

export const reservationService={
    /**
   * Reserve everything in the user's cart. Either ALL items succeed (returns
   * a reservation), or NONE do (returns 409 with the failing item, and
   * partial holds are released).
   *
   * The critical invariant: after this function returns, either a Reservation
   * row exists in Postgres with matching Redis holds, or nothing changed.
   * There is no in-between state.
   */
   async createReservation(userId:string){
    // Load cart with everything needed for the reservation
    const cart= await prisma.cart.findUnique({
        where:{userId},
        include:{
            items:{
                include:{
                    product:{
                        select:{id:true,isActive:true,price:true},
                    },
                },
            },
        },
    });
    if(!cart ||cart.items.length==0){
        throw errors.badRequest('EMPTY_CART', 'Cart is empty');
    }
    // Pre-flight validation: catch any obviously invalid state before
    // touching Redis. Once we start reserving, we own the compensation.
    for (const item of cart.items) {
      if (!item.product.isActive) {
        throw errors.conflict('PRODUCT_INACTIVE', 'A product in your cart is no longer available', {
          productId: item.productId,
        });
      }
    }
    // Generate per-item hold ids upfront.
    // We need holdIds BEFORE calling Redis so we can pass them to the Lua
    // script and store them in Postgres in the same shape.
    // NOTE: the reservation's own id is intentionally NOT pre-generated here.
    // Every other model relies on Prisma's `@default(cuid())`, and
    // createPaymentIntentSchema validates reservationId with z.cuid2() —
    // randomUUID() output (hyphenated) fails that check. Let Postgres assign
    // the id so it matches the same shape as every other id in the system.
    const itemsWithHolds = cart.items.map((item) => ({
      cartItem: item,
      holdId: randomUUID(),
    }));
    // ==========================================================
    // The core: attempt to reserve every item. Track successes.
    // ==========================================================
    const successfulHolds: Array<{ productId: string; holdId: string }> = [];
    let failure: { productId: string; reason: string; available?: number } | null = null;
    for( const {cartItem,holdId} of itemsWithHolds){
        const result=await reserveStock({
            productId:cartItem.productId,
            holdId,
            qty:cartItem.quantity,
        });

        if (result.ok) {
        successfulHolds.push({ productId: cartItem.productId, holdId });
      } else {
        failure = {
          productId: cartItem.productId,
          reason: result.reason,
        };
        break;   // stop on first failure — no point trying more
      }
    }
    // ==========================================================
    // COMPENSATION: if any item failed, release all successful holds.
    // ==========================================================
    if(failure){
        // Release in parallel — order doesn't matter, and we want to unblock stock ASAP
        await Promise.allSettled(
            successfulHolds.map((h)=>
            releaseStock(h).catch((err)=>{
            // Log but don't rethrow — the Redis TTL is our safety net for
            // holds we couldn't explicitly release.
                logger.error(
              { err, holdId: h.holdId, productId: h.productId },
              'Compensation release failed',
            );
            }),),);
    throw errors.conflict('RESERVATION_FAILED', 'One or more items are out of stock', {
        productId: failure.productId,
        reason: failure.reason,
      });
    }
    // ==========================================================
    // All items reserved. Persist the reservation to Postgres.
    // ==========================================================
    const expiresAt = new Date(Date.now() + env.RESERVATION_TTL_SEC * 1000);
    try{
        const reservation=await prisma.reservation.create({
            data:{
                userId,
                status:'PENDING',
                expiresAt,
                items:{
                    create:itemsWithHolds.map(({cartItem,holdId})=>({
                        productId:cartItem.productId,
                        quantity:cartItem.quantity,
                        priceSnapshot:cartItem.priceSnapshot,
                        holdId,
                    })),
                },
            },
            include:{items:true},
        });
       // Schedule the expiry job. If this fails, we have a problem: the
      // reservation exists but nothing will reclaim it if unpaid. The Redis
      // TTL will still release the holds after 10 min; the DB row will
      // remain PENDING forever unless the reconciliation job catches it.
      // For now: log loudly and continue. Real production: retry once.
      try{
        await reservationExpiryQueue.add(
          'expire',
          { reservationId: reservation.id },
          {
            delay: env.RESERVATION_TTL_SEC * 1000,
            jobId: reservation.id,           // dedup — one job per reservation
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
      }
      catch(err){
        logger.error(
          { err, reservationId: reservation.id },
          'Failed to schedule expiry job — Redis TTL will still release holds',
        );
      }
      // Clear the cart AFTER successful reservation. If we cleared first
      // and reservation failed, the user would lose their cart with no
      // reservation to show for it.
       await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
       return {
        reservationId: reservation.id,
        expiresAt: reservation.expiresAt,
        items: reservation.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          priceSnapshot: i.priceSnapshot,
        })),
        totalAmount: reservation.items.reduce(
          (sum, i) => sum + i.priceSnapshot * i.quantity,
          0,
        ),
      };
    }
    catch(dbErr){
        // Postgres write failed AFTER Redis holds were created. Roll back
      // Redis so we don't strand stock. Same compensation pattern.
      logger.error(
        { err: dbErr, userId, holdIds: successfulHolds.map((h) => h.holdId) },
        'Postgres reservation insert failed',
      );
      await Promise.allSettled(
        successfulHolds.map((h) => releaseStock(h)),
      );
      throw errors.internal('RESERVATION_PERSIST_FAILED');
    }
   },
   async getReservation(reservationId:string,userId:string){
    const reservation=await prisma.reservation.findUnique({
        where:{id:reservationId},
        include:{
            items:{
                include:{
                    product:{
                        select:{
                            id:true,slug:true,name:true,
                            images:{orderBy:{position:'asc'},take:1},
                        },
                    },
                },
            },
        },
    });
    if(!reservation){
        // Don't leak existence: return not found rather than forbidden.
        throw errors.notFound('RESERVATION_NOT_FOUND');
    }
    const totalAmount = reservation.items.reduce(
      (sum, i) => sum + i.priceSnapshot * i.quantity,
      0,
    );
    return {
      id: reservation.id,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      items: reservation.items,
      totalAmount,
    };
   },
   /**
   * User-initiated cancellation. Releases holds, marks reservation CANCELLED.
   * Idempotent: cancelling an already-cancelled reservation is a no-op.
   */
  async cancelReservation(reservationId:string,userId:string){
    const reservation=await prisma.reservation.findUnique({
        where: { id: reservationId },
      include: { items: true },
    });
    if (!reservation || reservation.userId !== userId) {
      throw errors.notFound('RESERVATION_NOT_FOUND');
    }

    if (reservation.status !== 'PENDING') {
      // Already resolved — no-op is the correct response
      return { status: reservation.status };
    }
    
    for (const item of reservation.items) {
      await releaseStock({
        productId: item.productId,
        holdId: item.holdId,
      }).catch((err) => {
        logger.error({ err, holdId: item.holdId }, 'Release failed during cancel');
      });
    }
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'CANCELLED' },
    });

    return { status: 'CANCELLED' as const };
  }
}