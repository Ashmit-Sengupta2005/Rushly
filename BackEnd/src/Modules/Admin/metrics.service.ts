import { prisma } from "../../config/prisma.js";
import type { RevenueByDayQuery, OverviewQuery } from "./metrics.schemas.js";
import { getRedisStocks } from "../CheckOut/Inventory.redis.js";

const LOW_STOCK_THRESHOLD = 10;

interface TopProductRow {
  product_id: string;
  name: string;
  units: bigint;
  revenue_paise: bigint;
}

interface CategoryRow {
  category: string | null;
  units: bigint;
  revenue_paise: bigint;
}

// Row shape from the raw SQL — Prisma's $queryRaw returns unknown[]
interface RevenueDayRow {
  day: Date;
  order_count: bigint;      // Postgres COUNT returns bigint
  revenue_paise: bigint;    // SUM returns bigint too
}

export const metricService={
    /**
   * Revenue by day for the last N days.
   *
   * Uses Postgres $queryRaw for the aggregation because Prisma's fluent API
   * doesn't support GROUP BY date_trunc natively. This is the idiomatic
   * escape hatch — ORM for the 95% of queries, raw SQL for the analytics 5%.
   *
   * Returns days in chronological order. Fills in zero-revenue days so charts
   * render as a continuous line (no gaps for days with no orders).
   */
   async revenueByDay(query: RevenueByDayQuery) {
     // Aggregate query: for each day in the window, count orders and sum revenue.
     // Uses generate_series to produce a row per day even when there are no orders.
     //
     // Excludes REFUNDED orders from revenue since that money went back.
     // Includes only PAID and FULFILLED orders as "real" revenue.
     const rows = await prisma.$queryRaw<RevenueDayRow[]>`
      WITH days AS (
        SELECT generate_series(
          date_trunc('day', NOW() - (${query.days} || ' days')::interval),
          date_trunc('day', NOW()),
          '1 day'::interval
        ) AS day
      ),
      order_agg AS (
        SELECT
          date_trunc('day', "createdAt") AS day,
          COUNT(*) AS order_count,
          SUM("totalAmount") AS revenue_paise
        FROM "Order"
        WHERE
          "createdAt" >= NOW() - (${query.days} || ' days')::interval
          AND status IN ('PAID', 'FULFILLED')
        GROUP BY date_trunc('day', "createdAt")
      )
      SELECT
        days.day AS day,
        COALESCE(order_agg.order_count, 0) AS order_count,
        COALESCE(order_agg.revenue_paise, 0) AS revenue_paise
      FROM days
      LEFT JOIN order_agg ON days.day = order_agg.day
      ORDER BY days.day ASC
    `;
    // Convert bigints to numbers for JSON serialization (JSON.stringify chokes on bigint).
    // Safe here because revenue is bounded — a single row won't exceed Number.MAX_SAFE_INTEGER.
    return rows.map((row) => ({
      day: row.day.toISOString().slice(0, 10),  // "2026-09-08" format
      orderCount: Number(row.order_count),
      revenuePaise: Number(row.revenue_paise),
      revenueRupees: Number(row.revenue_paise) / 100,  // convenience for the frontend
    }));
   },

   /**
    * Everything the admin dashboard shows besides the revenue chart:
    * KPIs, best sellers, category split, low stock and recent orders.
    * Revenue counts PAID + FULFILLED orders only (same rule as revenueByDay).
    */
   async overview(query: OverviewQuery) {
     const since = new Date(Date.now() - query.days * 86_400_000);
     const paidInWindow = { status: { in: ['PAID' as const, 'FULFILLED' as const] }, createdAt: { gte: since } };

     const [orderAgg, unitsAgg, refundAgg, liveHolds, topProducts, categories, lowStock, recentOrders] =
       await Promise.all([
         prisma.order.aggregate({ where: paidInWindow, _sum: { totalAmount: true }, _count: true }),
         prisma.orderItem.aggregate({ where: { order: paidInWindow }, _sum: { quantity: true } }),
         prisma.refund.aggregate({
           where: { status: 'SUCCEEDED', createdAt: { gte: since } },
           _sum: { amount: true },
         }),
         prisma.reservation.count({ where: { status: 'PENDING', expiresAt: { gt: new Date() } } }),
         prisma.$queryRaw<TopProductRow[]>`
           SELECT oi."productId" AS product_id,
                  MAX(oi."productNameSnapshot") AS name,
                  SUM(oi.quantity) AS units,
                  SUM(oi.quantity * oi."priceSnapshot") AS revenue_paise
           FROM "OrderItem" oi
           JOIN "Order" o ON o.id = oi."orderId"
           WHERE o.status IN ('PAID', 'FULFILLED') AND o."createdAt" >= ${since}
           GROUP BY oi."productId"
           ORDER BY units DESC, revenue_paise DESC
           LIMIT 8
         `,
         prisma.$queryRaw<CategoryRow[]>`
           SELECT c.name AS category,
                  SUM(oi.quantity) AS units,
                  SUM(oi.quantity * oi."priceSnapshot") AS revenue_paise
           FROM "OrderItem" oi
           JOIN "Order" o ON o.id = oi."orderId"
           JOIN "Product" p ON p.id = oi."productId"
           LEFT JOIN "Category" c ON c.id = p."categoryId"
           WHERE o.status IN ('PAID', 'FULFILLED') AND o."createdAt" >= ${since}
           GROUP BY c.name
           ORDER BY revenue_paise DESC
         `,
         prisma.inventory.findMany({
           where: { availableStock: { lte: LOW_STOCK_THRESHOLD }, product: { isActive: true } },
           orderBy: { availableStock: 'asc' },
           take: 12,
           select: {
             productId: true,
             availableStock: true,
             totalStock: true,
             product: { select: { name: true, slug: true } },
           },
         }),
         prisma.order.findMany({
           orderBy: { createdAt: 'desc' },
           take: 10,
           select: {
             id: true,
             status: true,
             totalAmount: true,
             createdAt: true,
             user: { select: { name: true, email: true } },
             _count: { select: { items: true } },
             refunds: { where: { status: 'SUCCEEDED' }, select: { amount: true } },
           },
         }),
       ]);

     // Postgres stock lags Redis during a sale — overlay the live numbers
     const live = await getRedisStocks(lowStock.map((i) => i.productId));
     const revenue = orderAgg._sum.totalAmount ?? 0;

     return {
       days: query.days,
       kpis: {
         revenuePaise: revenue,
         orders: orderAgg._count,
         averageOrderPaise: orderAgg._count > 0 ? Math.round(revenue / orderAgg._count) : 0,
         unitsSold: unitsAgg._sum.quantity ?? 0,
         refundedPaise: refundAgg._sum.amount ?? 0,
         liveHolds,
       },
       topProducts: topProducts.map((r) => ({
         productId: r.product_id,
         name: r.name,
         units: Number(r.units),
         revenuePaise: Number(r.revenue_paise),
       })),
       categories: categories.map((r) => ({
         category: r.category ?? 'Uncategorised',
         units: Number(r.units),
         revenuePaise: Number(r.revenue_paise),
       })),
       lowStock: lowStock.map((i) => ({
         productId: i.productId,
         name: i.product.name,
         slug: i.product.slug,
         availableStock: Math.max(0, live.get(i.productId) ?? i.availableStock),
         totalStock: i.totalStock,
       })),
       recentOrders: recentOrders.map((o) => ({
         id: o.id,
         status: o.status,
         totalAmount: o.totalAmount,
         createdAt: o.createdAt.toISOString(),
         customerName: o.user.name,
         customerEmail: o.user.email,
         itemCount: o._count.items,
         refundedAmount: o.refunds.reduce((sum, r) => sum + r.amount, 0),
       })),
     };
   },
};