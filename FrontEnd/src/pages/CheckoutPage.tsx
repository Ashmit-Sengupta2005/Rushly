import { useNavigate, Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useCart } from '@/features/cart/useCart';
import { AddressForm } from '@/features/checkout/AddressForm';
import { useCreateReservation } from '@/features/checkout/useCreateReservation';
import { buttonVariants } from '@/components/ui/button';
import { formatMoney } from '@/lib/formatMoney';
import type { ShippingAddressInput } from '@/types/api';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { data: cart, isLoading } = useCart();
  const createReservation = useCreateReservation();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="h-64 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  // After a successful reserve the cart is cleared — the mutation's navigate
  // happens first, so this only shows when someone opens /checkout directly.
  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center space-y-4">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Link to="/" className={buttonVariants()}>
          Browse products
        </Link>
      </div>
    );
  }

  // Reserve would fail with 409 INSUFFICIENT_STOCK — send them to fix the cart
  if (cart.hasOutOfStock) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center space-y-4">
        <p className="text-destructive">Some items in your cart are out of stock.</p>
        <Link to="/cart" className={buttonVariants({ variant: 'outline' })}>
          Update cart
        </Link>
      </div>
    );
  }

  const handleSubmit = (address: ShippingAddressInput) => {
    createReservation.mutate(address, {
      onSuccess: (reservation) => {
        // `replace`: Back from payment shouldn't return to a form for an empty cart
        navigate(`/checkout/payment/${reservation.reservationId}`, { replace: true });
      },
    });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to cart
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr_380px] gap-8">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Shipping address</h1>
          <AddressForm onSubmit={handleSubmit} isSubmitting={createReservation.isPending} />
          <p className="text-xs text-muted-foreground">
            Continuing holds these items for 10 minutes while you pay.
          </p>
        </div>

        <aside className="border border-border rounded-lg p-4 h-fit space-y-4 lg:sticky lg:top-20">
          <h2 className="font-semibold">Order summary</h2>
          <div className="space-y-3">
            {cart.items.map((item) => {
              const image = item.product.images[0];
              return (
                <div key={item.id} className="flex gap-3 text-sm">
                  <div className="h-14 w-14 bg-muted rounded-md flex-shrink-0 overflow-hidden">
                    {image && (
                      <img
                        src={image.url}
                        alt={image.alt ?? item.product.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                  </div>
                  {/* lineTotal = priceSnapshot × quantity = what reserve will charge */}
                  <p className="font-medium">{formatMoney(item.lineTotal)}</p>
                </div>
              );
            })}
          </div>
          <div className="pt-4 border-t border-border flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatMoney(cart.subtotal)}</span>
          </div>
        </aside>
      </main>
    </div>
  );
}
