import { Link, useNavigate } from 'react-router';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { ShoppingBag, Timer, X } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatMoney } from '@/lib/formatMoney';
import { useCart } from './useCart';
import { useCartDrawer } from './useCartDrawer';
import { CartItemRow } from './CartItemRow';

// Right-hand sheet with the cart. Same data as /cart, so edits here and there stay in sync.
export function CartDrawer() {
  const { open, setOpen } = useCartDrawer();
  const { data: cart } = useCart();
  const navigate = useNavigate();
  const itemCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
  const canCheckout = !!cart && cart.items.length > 0 && !cart.hasOutOfStock;

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <DialogPrimitive.Popup className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl outline-none transition-transform duration-300 ease-out data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full">
          <div className="flex items-center justify-between border-b border-border px-5 h-16">
            <DialogPrimitive.Title className="flex items-center gap-2 text-lg font-bold">
              <ShoppingBag className="size-5" />
              Your bag
              {itemCount > 0 && (
                <span className="text-sm font-medium text-muted-foreground">({itemCount})</span>
              )}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              render={<Button variant="ghost" size="icon" className="rounded-full" aria-label="Close" />}
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          {!cart || cart.items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-muted">
                <ShoppingBag className="size-6 text-muted-foreground" />
              </span>
              <div className="space-y-1">
                <p className="font-semibold">Your bag is empty</p>
                <p className="text-sm text-muted-foreground">The good stuff goes fast.</p>
              </div>
              <Button variant="brand" onClick={() => go('/')}>
                Browse drops
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-5">
                {cart.items.map((item) => (
                  <CartItemRow key={item.id} item={item} />
                ))}
              </div>
              <div className="space-y-3 border-t border-border bg-card/60 p-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-xl font-bold">{formatMoney(cart.subtotal)}</span>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Timer className="size-3.5 text-brand" />
                  Items are held for you for 10 minutes once you check out.
                </p>
                <Button
                  variant="brand"
                  size="lg"
                  className="w-full h-12"
                  disabled={!canCheckout}
                  onClick={() => go('/checkout')}
                >
                  Checkout
                </Button>
                <Link
                  to="/cart"
                  onClick={() => setOpen(false)}
                  className={buttonVariants({ variant: 'outline', className: 'w-full' })}
                >
                  View full bag
                </Link>
              </div>
            </>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
