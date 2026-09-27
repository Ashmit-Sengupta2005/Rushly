import { prisma } from "../../config/prisma.js";
import type { RevenueByDayQuery } from "./metrics.schemas.js";

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
};