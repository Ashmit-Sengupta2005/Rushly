import type { OrderStatusHistoryEntry } from '@/types/api';
import { formatDate } from '@/lib/formatDate';
import { OrderStatusBadge } from './OrderStatusBadge';

// Newest first. The first-ever entry is always null → PAID by "System"
// (orders are created by the Stripe webhook); later entries are admin refunds.
export function StatusTimeline({ history }: { history: OrderStatusHistoryEntry[] }) {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No status changes recorded.</p>;
  }

  const sorted = [...history].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  );

  return (
    <ol className="relative border-l border-border ml-2 space-y-5">
      {sorted.map((entry) => (
        <li key={entry.id} className="pl-5 relative">
          <span
            aria-hidden="true"
            className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-foreground border-2 border-background"
          />
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <OrderStatusBadge status={entry.toStatus} />
            {entry.changedBy && (
              <span className="text-xs text-muted-foreground">by {entry.changedBy}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            <time dateTime={entry.changedAt}>{formatDate(entry.changedAt)}</time>
          </p>
          {entry.reason && <p className="text-sm text-muted-foreground mt-1">{entry.reason}</p>}
        </li>
      ))}
    </ol>
  );
}
