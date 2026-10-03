import { Router } from "express";
import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { cacheService, cacheKeys } from "../../utils/cache.service.js";
import { requireAuth } from "../Auth/Auth.middleware.js";

const WINDOW_MS = 7 * 86_400_000;
const LIMIT = 20;

/**
 * Real purchases for the storefront's "just sold" toasts. Deliberately
 * anonymous: product + city + time only — never the buyer's name.
 * Cached for 30s since every open tab polls it.
 */
async function recentSales() {
  const cached = await cacheService.get<RecentSale[]>(cacheKeys.recentSales());
  if (cached) return cached;

  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        status: { in: ['PAID', 'FULFILLED'] },
        createdAt: { gte: new Date(Date.now() - WINDOW_MS) },
      },
    },
    orderBy: { order: { createdAt: 'desc' } },
    take: LIMIT,
    select: {
      id: true,
      productNameSnapshot: true,
      productImageSnapshot: true,
      product: { select: { slug: true } },
      order: { select: { createdAt: true, shippingAddress: true } },
    },
  });

  const sales: RecentSale[] = items.map((item) => {
    const address = item.order.shippingAddress as { city?: unknown } | null;
    return {
      id: item.id,
      productName: item.productNameSnapshot,
      productSlug: item.product.slug,
      image: item.productImageSnapshot,
      city: typeof address?.city === 'string' ? address.city : null,
      purchasedAt: item.order.createdAt.toISOString(),
    };
  });
  await cacheService.set(cacheKeys.recentSales(), sales, 30);
  return sales;
}

interface RecentSale {
  id: string;
  productName: string;
  productSlug: string;
  image: string | null;
  city: string | null;
  purchasedAt: string;
}

// Mounted at /api/activity
export const activityRouter = Router();
activityRouter.get(
  '/recent-sales',
  requireAuth,
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ sales: await recentSales() });
  }),
);
