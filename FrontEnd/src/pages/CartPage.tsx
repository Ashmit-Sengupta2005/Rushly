import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useCart } from '@/features/cart/useCart';
import { CartItemRow } from '@/features/cart/CartItemRow';
import { CartSummary } from '@/features/cart/CartSummary';
import { buttonVariants } from '@/components/ui/button';

export default function CartPage() {
  const { data: cart, isLoading, isError } = useCart();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue shopping
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Your cart</h1>

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-destructive py-8 text-center">
            Could not load your cart. Try refreshing.
          </p>
        )}

        {cart && cart.items.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Link to="/" className={buttonVariants()}>
              Browse products
            </Link>
          </div>
        )}

        {cart && cart.items.length > 0 && (
          <div className="grid md:grid-cols-[1fr_320px] gap-8">
            <div>
              {cart.items.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </div>
            <CartSummary cart={cart} />
          </div>
        )}
      </main>
    </div>
  );
}