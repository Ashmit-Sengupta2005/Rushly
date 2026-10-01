import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types/api';

// Theme's built-in variants are grey/near-black, so colours come from classes.
// Record<OrderStatus, …> forces every status to be covered — including
// RESERVED, which the type has even though orders are created already PAID.
const statusStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
  RESERVED: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
  PAID: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  FULFILLED: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800',
  REFUNDED: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
};

const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  RESERVED: 'Reserved',
  PAID: 'Paid',
  FULFILLED: 'Fulfilled',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(statusStyles[status], className)}>
      {orderStatusLabels[status]}
    </Badge>
  );
}
