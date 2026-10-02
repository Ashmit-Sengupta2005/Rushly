import { Link, useLocation, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { useOrder } from '@/features/orders/useOrder';
import { OrderStatusBadge } from '@/features/orders/OrderStatusBadge';
import { StatusTimeline } from '@/features/orders/StatusTimeline';
import { shortOrderId } from '@/features/orders/shortOrderId';
import { buttonVariants } from '@/components/ui/button';
import { formatMoney } from '@/lib/formatMoney';
import { formatDate } from '@/lib/formatDate';

/** Set by CheckoutCompletePage when it redirects here right after payment. */
export interface OrderDetailLocationState {
  justPlaced?: boolean;
}

const REFUND_STATUS_LABEL = { PENDING: 'Processing', SUCCEEDED: 'Refunded', FAILED: 'Failed' } as const;

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { data: order, isLoading, isError } = useOrder(id);

  // Only celebrate when arriving straight from checkout — not when an old
  // order is opened from the list.
  const justPlaced = (location.state as OrderDetailLocationState | null)?.justPlaced === true;

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          <div className="h-24 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  // useOrder doesn't retry 404s, so "not yours / doesn't exist" lands here quickly
  if (isError || !order) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-md mx-auto p-8 text-center space-y-4">
          <h1 className="text-xl font-semibold">Order not found</h1>
          <p className="text-sm text-muted-foreground">
            This order doesn't exist or belongs to a different account.
          </p>
          <Link to="/orders" className={buttonVariants()}>
            Back to my orders
          </Link>
        </div>
      </div>
    );
  }

  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const addr = order.shippingAddress;
  // Partial refunds keep status PAID — refundedAmount is the only signal
  const partiallyRefunded = order.refundedAmount > 0 && order.status !== 'REFUNDED';

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to my orders
        </Link>

        {justPlaced && order.status === 'PAID' && (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 p-5 flex items-start gap-4">
            <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="space-y-1">
              <h2 className="font-semibold">Thank you — your order is confirmed</h2>
              <p className="text-sm text-muted-foreground">A confirmation email is on its way.</p>
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Order #{shortOrderId(order.id)}</h1>
            <p className="text-sm text-muted-foreground mt-1">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <OrderStatusBadge status={order.status} />
            {partiallyRefunded && (
              <OrderStatusBadge status="REFUNDED" className="opacity-80" />
            )}
          </div>
        </div>

        <section className="border border-border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold">Items ({itemCount})</h2>
          <div className="divide-y divide-border">
            {/* Snapshots only — what was actually bought, even if the product changes later */}
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                <div className="h-16 w-16 bg-muted rounded-md flex-shrink-0 overflow-hidden">
                  {item.productImageSnapshot && (
                    <img
                      src={item.productImageSnapshot}
                      alt={item.productNameSnapshot}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.productNameSnapshot}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Qty {item.quantity} · {formatMoney(item.priceSnapshot)} each
                  </p>
                </div>
                <p className="font-semibold text-sm">{formatMoney(item.priceSnapshot * item.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-4 space-y-1 text-sm">
            <div className="flex justify-between font-semibold">
              <span>Total paid</span>
              <span>{formatMoney(order.totalAmount)}</span>
            </div>
            {order.refundedAmount > 0 && (
              <>
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>Refunded</span>
                  <span>−{formatMoney(order.refundedAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Net charged</span>
                  <span>{formatMoney(order.totalAmount - order.refundedAmount)}</span>
                </div>
              </>
            )}
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="border border-border rounded-lg p-4 space-y-3">
            <h2 className="font-semibold">Shipping address</h2>
            {addr ? (
              <address className="not-italic text-sm text-muted-foreground leading-relaxed">
                <p className="text-foreground font-medium">{addr.fullName}</p>
                <p>{addr.phone}</p>
                <p className="mt-2">{addr.line1}</p>
                {addr.line2 && <p>{addr.line2}</p>}
                <p>
                  {addr.city}, {addr.state} {addr.pincode}
                </p>
                {addr.country && <p>{addr.country}</p>}
              </address>
            ) : (
              <p className="text-sm text-muted-foreground">No shipping address on file for this order.</p>
            )}
          </section>

          <section className="border border-border rounded-lg p-4 space-y-3">
            <h2 className="font-semibold">Status history</h2>
            <StatusTimeline history={order.statusHistory} />
          </section>
        </div>

        {order.refunds.length > 0 && (
          <section className="border border-border rounded-lg p-4 space-y-3">
            <h2 className="font-semibold">Refunds</h2>
            <ul className="divide-y divide-border text-sm">
              {order.refunds.map((r) => (
                <li key={r.id} className="flex justify-between gap-4 py-2 first:pt-0 last:pb-0">
                  <div>
                    <p>{formatMoney(r.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.createdAt)}
                      {r.reason ? ` · ${r.reason.replaceAll('_', ' ')}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{REFUND_STATUS_LABEL[r.status]}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-xs text-muted-foreground break-all">
          Full order ID <code className="font-mono">{order.id}</code>
        </p>
      </main>
    </div>
  );
}
