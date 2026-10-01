import { Link, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, Package } from 'lucide-react';
import { useOrder } from '@/features/orders/useOrder';
import { buttonVariants } from '@/components/ui/button';
import { formatMoney } from '@/lib/formatMoney';
import type { OrderStatus } from '@/types/api';

// Phase 3c adds the shared Navbar, status badge + history timeline and the
// /orders list on top of this page — extend it, don't rewrite it.

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  RESERVED: 'Reserved',
  PAID: 'Paid',
  FULFILLED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, isError } = useOrder(id);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-4">
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4">
        <h1 className="text-xl font-semibold">Order not found</h1>
        <p className="text-sm text-muted-foreground">
          This order doesn't exist or belongs to a different account.
        </p>
        <Link to="/" className={buttonVariants()}>Back to shop</Link>
      </div>
    );
  }

  const isPaid = order.status === 'PAID' || order.status === 'FULFILLED';
  const address = order.shippingAddress;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue shopping
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Confirmation banner — this is where checkout lands after paying */}
        <section className="rounded-lg border border-border p-6 flex items-start gap-4">
          {isPaid ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
          ) : (
            <Package className="h-8 w-8 text-muted-foreground shrink-0" />
          )}
          <div className="space-y-1 min-w-0">
            <h1 className="text-xl font-semibold">
              {isPaid ? 'Thank you — your order is confirmed' : `Order ${STATUS_LABEL[order.status].toLowerCase()}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              Placed {formatDate(order.createdAt)} · Status: {STATUS_LABEL[order.status]}
            </p>
            <p className="text-xs text-muted-foreground break-all">
              Order ID <code className="font-mono">{order.id}</code>
            </p>
            {isPaid && (
              <p className="text-sm text-muted-foreground">A confirmation email is on its way.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border p-6 space-y-4">
          <h2 className="font-semibold">Items</h2>
          <div className="divide-y divide-border">
            {/* Snapshots only — what was actually bought, even if the product changes later */}
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                <div className="h-16 w-16 bg-muted rounded-md overflow-hidden shrink-0">
                  {item.productImageSnapshot && (
                    <img
                      src={item.productImageSnapshot}
                      alt={item.productNameSnapshot}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.productNameSnapshot}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(item.priceSnapshot)} × {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-medium">{formatMoney(item.priceSnapshot * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border space-y-1 text-sm">
            <div className="flex justify-between font-semibold">
              <span>Total paid</span>
              <span>{formatMoney(order.totalAmount)}</span>
            </div>
            {order.refundedAmount > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-500">
                <span>Refunded</span>
                <span>−{formatMoney(order.refundedAmount)}</span>
              </div>
            )}
          </div>
        </section>

        {address && (
          <section className="rounded-lg border border-border p-6 space-y-1 text-sm">
            <h2 className="font-semibold mb-2">Shipping to</h2>
            <p>{address.fullName}</p>
            <p className="text-muted-foreground">
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ''}
            </p>
            <p className="text-muted-foreground">
              {address.city}, {address.state} {address.pincode}
              {address.country ? `, ${address.country}` : ''}
            </p>
            <p className="text-muted-foreground">{address.phone}</p>
          </section>
        )}

        <Link to="/" className={buttonVariants({ variant: 'outline' })}>
          Continue shopping
        </Link>
      </main>
    </div>
  );
}
