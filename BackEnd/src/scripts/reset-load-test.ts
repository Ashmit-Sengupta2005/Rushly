import { prisma } from '../config/prisma.js';
import { redis } from '../config/redis.js';
import { reservationExpiryQueue, reservationExpiryEvents } from '../config/queues.js';
import { reservationService } from '../Modules/CheckOut/Reservation.service.js';
import { loadInventoryScripts, syncProductStock } from '../Modules/CheckOut/Inventory.redis.js';

// Puts the local database back to a clean starting point before a k6 run:
//   1. cancels the load-test users' pending reservations (returns held stock)
//   2. empties their carts
//   3. sets the test product's stock to exactly <stock> in Postgres and Redis
//
// Usage: pnpm loadtest:reset <productId> [stock=100]
// Local development only — it overwrites the product's stock.
async function main() {
  const [productId, stockArg = '100'] = process.argv.slice(2);
  const stock = Number(stockArg);
  if (!productId || !Number.isInteger(stock) || stock < 0) {
    throw new Error('Usage: pnpm loadtest:reset <productId> [stock=100]');
  }

  // Cancelling releases holds via EVALSHA, so the scripts must be loaded in this process.
  await loadInventoryScripts();

  const loadTestUsers = { user: { email: { startsWith: 'loadtest' } } };

  const pending = await prisma.reservation.findMany({
    where: { status: 'PENDING', ...loadTestUsers },
    select: { id: true, userId: true },
  });
  for (const r of pending) {
    await reservationService.cancelReservation(r.id, r.userId);
  }

  const { count: cartItems } = await prisma.cartItem.deleteMany({
    where: { cart: loadTestUsers },
  });

  const inventory = await prisma.inventory.findUnique({ where: { productId } });
  if (!inventory) throw new Error(`No inventory row for product ${productId}`);
  await prisma.inventory.update({
    where: { productId },
    data: {
      availableStock: stock,
      totalStock: Math.max(inventory.totalStock, stock),
      version: { increment: 1 },
    },
  });
  await syncProductStock(productId);

  console.log(
    `Cancelled ${pending.length} reservations, removed ${cartItems} cart items, ` +
      `set stock of ${productId} to ${stock}`,
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Close every connection the imported modules opened (including the
    // BullMQ queue's Redis connections), otherwise Node never exits.
    await Promise.all([
      prisma.$disconnect(),
      reservationExpiryQueue.close(),
      reservationExpiryEvents.close(),
    ]);
    redis.disconnect();
  });
