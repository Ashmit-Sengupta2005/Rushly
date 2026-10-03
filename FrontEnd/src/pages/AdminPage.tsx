import { useState, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/features/auth/useAuth';
import { useAdminOverview, useAdminRevenue, useRefundOrder } from '@/features/admin/useAdmin';
import { BarList, RevenueColumns } from '@/features/admin/Charts';
import { OrderStatusBadge } from '@/features/orders/OrderStatusBadge';
import { shortOrderId } from '@/features/orders/shortOrderId';
import { formatDate } from '@/lib/formatDate';
import { formatCompactMoney, formatMoney } from '@/lib/formatMoney';
import { cn } from '@/lib/utils';
import type { AdminOverview } from '@/types/api';

const RANGES = [7, 30, 90] as const;

export default function AdminPage() {
  const user = useCurrentUser();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const overview = useAdminOverview(days);
  const revenue = useAdminRevenue(days);

  // The API enforces ADMIN too; this just keeps customers off a page of 403s
  if (user && user.role !== 'ADMIN') return <Navigate to="/" replace />;

  const data = overview.data;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pt-8 pb-16 space-y-6 animate-fade-up">
        {/* Header + the one filter row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">Admin</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter">Store dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            {(overview.isFetching || revenue.isFetching) && (
              <RefreshCw className="size-4 animate-spin text-muted-foreground" aria-label="Refreshing" />
            )}
            <div role="radiogroup" aria-label="Date range" className="flex rounded-xl bg-muted p-1">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={days === r}
                  onClick={() => setDays(r)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    days === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {r}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {overview.isError && (
          <div className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 py-10 text-center text-destructive">
            Could not load metrics. Try refreshing.
          </div>
        )}

        {/* KPIs — revenue is the one hero figure */}
        <section className="grid gap-4 md:grid-cols-[1.4fr_2fr]">
          <Card className="flex flex-col justify-between bg-zinc-950 text-white ring-white/10">
            <p className="text-sm text-white/60">Revenue · last {days} days</p>
            <p className="mt-6 text-5xl font-extrabold tracking-tight">
              {data ? formatMoney(data.kpis.revenuePaise) : '—'}
            </p>
            <p className="mt-2 text-sm text-white/60">Paid and fulfilled orders, before refunds</p>
          </Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Orders" value={data?.kpis.orders.toLocaleString('en-IN')} />
            <Stat label="Average order" value={data && formatMoney(data.kpis.averageOrderPaise)} />
            <Stat label="Units sold" value={data?.kpis.unitsSold.toLocaleString('en-IN')} />
            <Stat label="Refunded" value={data && formatMoney(data.kpis.refundedPaise)} />
            <Stat label="Live checkout holds" value={data?.kpis.liveHolds.toLocaleString('en-IN')} hint="Reservations waiting on payment right now" />
            <Stat label="Low-stock products" value={data?.lowStock.length.toLocaleString('en-IN')} />
          </div>
        </section>

        <Card>
          <CardTitle title="Revenue by day" subtitle={`Last ${days} days`} />
          {revenue.data ? (
            <RevenueColumns data={revenue.data.data} />
          ) : (
            <div className="h-64 animate-pulse rounded-xl bg-muted" />
          )}
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle title="Best sellers" subtitle="Units sold" />
            {data ? (
              <BarList
                empty="No sales in this period yet."
                rows={data.topProducts.map((p) => ({
                  key: p.productId,
                  label: p.name,
                  value: p.units,
                  display: `${p.units}`,
                  hint: `${formatMoney(p.revenuePaise)} revenue`,
                }))}
              />
            ) : (
              <SkeletonRows />
            )}
          </Card>
          <Card>
            <CardTitle title="Revenue by category" />
            {data ? (
              <BarList
                empty="No sales in this period yet."
                rows={data.categories.map((c) => ({
                  key: c.category,
                  label: c.category,
                  value: c.revenuePaise,
                  display: formatCompactMoney(c.revenuePaise),
                  hint: `${c.units} units`,
                }))}
              />
            ) : (
              <SkeletonRows />
            )}
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
          <Card>
            <CardTitle title="Low stock" subtitle="10 or fewer left (live)" />
            {data ? <LowStockList items={data.lowStock} /> : <SkeletonRows />}
          </Card>
          <Card className="overflow-hidden">
            <CardTitle title="Recent orders" />
            {data ? <RecentOrdersTable orders={data.recentOrders} /> : <SkeletonRows />}
          </Card>
        </div>
      </main>
    </div>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-2xl bg-card p-5 ring-1 ring-border', className)}>{children}</section>;
}

function CardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value?: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border" title={hint}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value ?? '—'}</p>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function LowStockList({ items }: { items: AdminOverview['lowStock'] }) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Everything is well stocked.</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const out = item.availableStock === 0;
        const pct = item.totalStock > 0 ? (item.availableStock / item.totalStock) * 100 : 0;
        return (
          <li key={item.productId} className="text-sm">
            <div className="mb-1 flex items-center justify-between gap-3">
              <Link to={`/products/${item.slug}`} className="truncate hover:underline">
                {item.name}
              </Link>
              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums">
                {out && <AlertTriangle className="size-3.5 text-red-500" />}
                {out ? 'Sold out' : `${item.availableStock} left`}
              </span>
            </div>
            {/* Meter: severity colour on a lighter track of the same hue */}
            <div className={cn('h-1.5 rounded-full', out ? 'bg-red-500/20' : 'bg-amber-500/20')}>
              <div
                className={cn('h-full rounded-full', out ? 'bg-red-500' : 'bg-amber-500')}
                style={{ width: `${Math.max(pct, out ? 0 : 3)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RecentOrdersTable({ orders }: { orders: AdminOverview['recentOrders'] }) {
  const refund = useRefundOrder();
  const [confirming, setConfirming] = useState<string | null>(null);

  if (orders.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>;
  }
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-5 py-2 font-medium">Order</th>
            <th className="px-2 py-2 font-medium">Customer</th>
            <th className="px-2 py-2 font-medium">Status</th>
            <th className="px-2 py-2 text-right font-medium">Total</th>
            <th className="px-5 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((o) => {
            const refundable = o.status === 'PAID' && o.refundedAmount === 0;
            const busy = refund.isPending && refund.variables === o.id;
            return (
              <tr key={o.id}>
                <td className="px-5 py-3">
                  <p className="font-mono text-xs font-semibold">#{shortOrderId(o.id)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</p>
                </td>
                <td className="px-2 py-3">
                  <p className="max-w-40 truncate">{o.customerName}</p>
                  <p className="max-w-40 truncate text-xs text-muted-foreground">{o.customerEmail}</p>
                </td>
                <td className="px-2 py-3">
                  <OrderStatusBadge status={o.status} />
                </td>
                <td className="px-2 py-3 text-right tabular-nums">
                  {formatMoney(o.totalAmount)}
                  {o.refundedAmount > 0 && (
                    <p className="text-xs text-muted-foreground">−{formatMoney(o.refundedAmount)} refunded</p>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {refundable &&
                    (confirming === o.id ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => refund.mutate(o.id, { onSettled: () => setConfirming(null) })}
                        >
                          {busy ? <Loader2 className="size-3.5 animate-spin" /> : 'Confirm'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setConfirming(o.id)}>
                        Refund
                      </Button>
                    ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
