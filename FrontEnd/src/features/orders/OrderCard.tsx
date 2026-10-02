import { Link } from 'react-router';
import type { OrderListItem } from '@/types/api';
import { formatMoney } from '@/lib/formatMoney';
import { formatDate } from '@/lib/formatDate';
import { OrderStatusBadge } from './OrderStatusBadge';
import { shortOrderId } from './shortOrderId';

export function OrderCard({ order }: { order: OrderListItem }) {
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const firstItem = order.items[0];
  const otherLines = order.items.length - 1;

  return (
    <Link
      to={`/orders/${order.id}`}
      className="block rounded-2xl border border-border bg-card p-5 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-foreground/5 hover:border-foreground/15"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold font-mono tracking-tight">#{shortOrderId(order.id)}</p>
          <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="flex gap-3 items-center">
        <div className="size-16 bg-muted rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-border">
          {/* Snapshots only — what was bought, even if the product changed since */}
          {firstItem?.productImageSnapshot && (
            <img
              src={firstItem.productImageSnapshot}
              alt={firstItem.productNameSnapshot}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{firstItem?.productNameSnapshot ?? 'Order'}</p>
          <p className="text-xs text-muted-foreground">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
            {otherLines > 0 && ` · +${otherLines} more ${otherLines === 1 ? 'product' : 'products'}`}
          </p>
        </div>
        <p className="font-bold">{formatMoney(order.totalAmount)}</p>
      </div>
    </Link>
  );
}
