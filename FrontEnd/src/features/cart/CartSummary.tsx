import { useNavigate } from 'react-router';
import { ArrowRight, Lock } from 'lucide-react';
import type { Cart } from '@/types/api';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/formatMoney';

export function CartSummary({ cart }: { cart: Cart }) {
  const navigate = useNavigate();

  // Use the server-computed subtotal: it sums priceSnapshot × quantity, which is
  // exactly what reserve + Stripe charge. (product.price is the CURRENT price and
  // can differ — see hasPriceChanges.)
  const { subtotal } = cart;

  // Reserve fails with 409 INSUFFICIENT_STOCK if any line can't be filled,
  // so block checkout here instead of letting the user hit that error.
  const canCheckout = cart.items.length > 0 && !cart.hasOutOfStock;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-xs lg:sticky lg:top-24 h-fit">
      <h2 className="text-lg font-bold">Order summary</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span className="text-muted-foreground">Calculated at checkout</span>
        </div>
      </div>

      <div className="pt-4 border-t border-dashed border-border flex justify-between items-baseline font-bold text-lg">
        <span>Total</span>
        <span>{formatMoney(subtotal)}</span>
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

      <Button
        className="w-full h-12 text-base"
        size="lg"
        variant="brand"
        disabled={!canCheckout}
        onClick={() => navigate('/checkout')}
      >
        Checkout
        <ArrowRight className="size-5" />
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Secure checkout powered by Stripe
      </p>
    </div>
  );
}
