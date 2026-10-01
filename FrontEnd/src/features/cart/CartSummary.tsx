import { Link } from 'react-router';
import type { Cart } from '@/types/api';
import { buttonVariants } from '@/components/ui/button';
import { formatMoney } from '@/lib/formatMoney';
import { cn } from '@/lib/utils';

export function CartSummary({ cart }: { cart: Cart }) {
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  // Reserve fails with 409 INSUFFICIENT_STOCK if any line can't be filled,
  // so block checkout here instead of letting the user hit that error.
  const canCheckout = !cart.hasOutOfStock && cart.items.length > 0;

  return (
    <aside className="rounded-lg border border-border p-6 space-y-4 h-fit md:sticky md:top-24">
      <h2 className="font-semibold">Order summary</h2>

      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
        </span>
        {/* subtotal = priceSnapshot totals = the amount Stripe will charge */}
        <span className="font-semibold">{formatMoney(cart.subtotal)}</span>
      </div>

      {cart.hasPriceChanges && (
        <p className="text-xs text-amber-600 dark:text-amber-500">
          Some prices changed since you added them. You'll pay the price shown in your cart.
        </p>
      )}
      {cart.hasOutOfStock && (
        <p className="text-xs text-destructive">
          Some items are out of stock. Update your cart to continue.
        </p>
      )}

      {canCheckout ? (
        <Link to="/checkout" className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
          Checkout
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={cn(buttonVariants({ size: 'lg' }), 'w-full pointer-events-none opacity-50')}
        >
          Checkout
        </span>
      )}
    </aside>
  );
}
