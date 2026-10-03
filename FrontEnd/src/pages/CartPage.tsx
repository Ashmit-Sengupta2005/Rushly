import { Link } from 'react-router';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useCart } from '@/features/cart/useCart';
import { CartItemRow } from '@/features/cart/CartItemRow';
import { CartSummary } from '@/features/cart/CartSummary';
import { buttonVariants } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { ProductRow } from '@/features/catalog/ProductRow';

export default function CartPage() {
  const { data: cart, isLoading, isError } = useCart();
  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 pb-16">
        {/* Page-level back link (not navigation) stays with the page */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="size-4" />
          Continue shopping
        </Link>
        <div className="flex items-baseline gap-3 mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter">Your bag</h1>
          {itemCount > 0 && (
            <span className="text-muted-foreground">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 py-12 text-center text-destructive">
            Could not load your cart. Try refreshing.
          </div>
        )}

        {cart && cart.items.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border py-20 text-center animate-fade-up">
            <span className="grid size-14 place-items-center rounded-2xl bg-muted">
              <ShoppingBag className="size-6 text-muted-foreground" />
            </span>
            <div className="space-y-1">
              <p className="text-lg font-semibold">Your bag is empty</p>
              <p className="text-sm text-muted-foreground">The good stuff goes fast — go grab something.</p>
            </div>
            <Link to="/" className={buttonVariants({ variant: 'brand', size: 'lg' })}>
              Browse drops
            </Link>
          </div>
        )}

        {cart && cart.items.length === 0 && (
          <div className="mt-14">
            <ProductRow eyebrow="Still in stock" title="Trending right now" />
          </div>
        )}

        {cart && cart.items.length > 0 && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
            <div className="rounded-2xl border border-border bg-card px-4 sm:px-6 shadow-xs">
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
