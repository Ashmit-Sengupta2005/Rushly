// Temporary verification script — exercises the REAL reservation -> webhook
// flow to confirm Postgres Inventory.availableStock now decrements on a
// successful payment. Cleans up everything it creates and restores baseline
// stock afterward. Delete this file after use.

import { prisma } from '../config/prisma.js';
import { redis } from '../config/redis.js';
import { reservationService } from '../Modules/CheckOut/Reservation.service.js';
import { stripeWebhookService } from '../Modules/WebHooks/stripeWebhooks.service.js';
import { initRedisInventory, getRedisStock } from '../Modules/CheckOut/Inventory.redis.js';
import { reservationExpiryQueue } from '../config/queues.js';

async function main() {
  const product = await prisma.product.findUnique({
    where: { slug: 'phantom-runner-og' },
    include: { inventory: true },
  });
  if (!product || !product.inventory) throw new Error('product/inventory not found');
  const productId = product.id;

  await initRedisInventory();

  const baselinePg = product.inventory.availableStock;
  const baselineRedis = await getRedisStock(productId);
  console.log('BASELINE', { baselinePg, baselineRedis });

  const user = await prisma.user.findFirst();
  if (!user) throw new Error('no user found');

  await prisma.cart.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });
  const cart = await prisma.cart.findUniqueOrThrow({ where: { userId: user.id } });
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cartItem.create({
    data: { cartId: cart.id, productId, quantity: 1, priceSnapshot: product.price },
  });

  const reservation = await reservationService.createReservation(user.id);
  console.log('Reservation created:', reservation.reservationId);

  const afterReserveRedis = await getRedisStock(productId);
  console.log('AFTER RESERVE — redis stock:', afterReserveRedis, '(expected', (baselineRedis ?? 0) - 1, ')');

  const fakeIntent = {
    id: 'pi_test_verify_' + Date.now(),
    metadata: { reservationId: reservation.reservationId },
  } as any;

  await stripeWebhookService.handlePaymentSucceeded(fakeIntent);

  const invAfter = await prisma.inventory.findUnique({ where: { productId } });
  const redisAfter = await getRedisStock(productId);
  const order = await prisma.order.findFirst({ where: { reservationId: reservation.reservationId } });

  console.log('AFTER WEBHOOK', {
    postgresAvailableStock: invAfter?.availableStock,
    redisStock: redisAfter,
    orderCreated: !!order,
    orderStatus: order?.status,
  });

  const pgOk = invAfter?.availableStock === baselinePg - 1;
  const redisOk = redisAfter === (baselineRedis ?? 0) - 1;

  console.log(pgOk ? '✅ Postgres availableStock decremented correctly' : '❌ Postgres availableStock NOT decremented correctly');
  console.log(redisOk ? '✅ Redis stock decremented correctly' : '❌ Redis stock NOT decremented correctly');

  // Re-seed simulation: does a fresh boot preserve the correct count now?
  await initRedisInventory();
  const redisAfterReseed = await getRedisStock(productId);
  const reseedOk = redisAfterReseed === invAfter?.availableStock;
  console.log(
    reseedOk
      ? '✅ Redis reseed from Postgres matches (restart-safe now)'
      : '❌ Redis reseed mismatch — restart would still corrupt stock',
    { redisAfterReseed, postgresAvailableStock: invAfter?.availableStock },
  );

  // -------- CLEANUP: restore everything to pre-test state --------
  if (order) {
    const outboxEvents = await prisma.outboxEvent.findMany({ where: { type: 'order_confirmation' } });
    const toDelete = outboxEvents.filter((e: any) => (e.payload as any)?.orderId === order.id);
    if (toDelete.length) {
      await prisma.outboxEvent.deleteMany({ where: { id: { in: toDelete.map((e: any) => e.id) } } });
    }
    await prisma.order.delete({ where: { id: order.id } }); // cascades items + statusHistory
  }
  await prisma.reservation.delete({ where: { id: reservation.reservationId } }); // cascades items
  await reservationExpiryQueue.remove(reservation.reservationId).catch(() => {});
  await prisma.inventory.update({ where: { productId }, data: { availableStock: baselinePg } });
  await redis.set(`inventory:${productId}`, baselinePg);

  console.log('Cleanup complete — baseline restored.');
}

main()
  .catch((err) => {
    console.error('TEST FAILED', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await reservationExpiryQueue.close();
    await prisma.$disconnect();
    await redis.quit();
  });
