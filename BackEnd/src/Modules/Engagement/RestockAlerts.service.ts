import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { errors } from "../../utils/Errors.js";

export interface RestockNotificationPayload {
  userId: string;
  productId: string;
}

/**
 * Called inside the inventory-adjust transaction when a product goes from
 * sold out to in stock. Writes one outbox event per waiting subscriber and
 * marks them notified — all in the caller's transaction.
 */
export async function queueRestockNotifications(tx: Prisma.TransactionClient, productId: string) {
  const alerts = await tx.restockAlert.findMany({
    where: { productId, notifiedAt: null },
    select: { id: true, userId: true },
  });
  if (alerts.length === 0) return 0;

  await tx.outboxEvent.createMany({
    data: alerts.map((a) => ({
      type: 'restock_notification',
      payload: { userId: a.userId, productId } satisfies RestockNotificationPayload,
    })),
  });
  await tx.restockAlert.updateMany({
    where: { id: { in: alerts.map((a) => a.id) } },
    data: { notifiedAt: new Date() },
  });
  return alerts.length;
}

export const restockAlertsService = {
  /** Product ids the user is waiting on (not yet notified). */
  async listActive(userId: string) {
    const alerts = await prisma.restockAlert.findMany({
      where: { userId, notifiedAt: null },
      select: { productId: true },
    });
    return alerts.map((a) => a.productId);
  },

  // Idempotent: subscribing twice is a no-op; re-subscribing after a past
  // notification re-arms the alert.
  async subscribe(userId: string, productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { isActive: true },
    });
    if (!product?.isActive) throw errors.notFound('PRODUCT_NOT_FOUND', 'Product not found');
    await prisma.restockAlert.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: { notifiedAt: null },
    });
  },

  async unsubscribe(userId: string, productId: string) {
    await prisma.restockAlert.deleteMany({ where: { userId, productId } });
  },
};
