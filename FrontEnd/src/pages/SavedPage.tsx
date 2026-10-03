import { Link } from 'react-router';
import { Heart } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { buttonVariants } from '@/components/ui/button';
import { ProductCard } from '@/features/catalog/ProductCard';
import { useWishlist } from '@/features/wishlist/useWishlist';

export default function SavedPage() {
  const { data: items, isLoading, isError } = useWishlist();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pt-8 pb-16 space-y-8 animate-fade-up">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">Wishlist</p>
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter">Saved for later</h1>
            {!!items?.length && <span className="text-muted-foreground">{items.length} items</span>}
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 py-12 text-center text-destructive">
            Could not load your saved items. Try refreshing.
          </div>
        )}

        {items && items.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border py-20 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-muted">
              <Heart className="size-6 text-muted-foreground" />
            </span>
            <div className="space-y-1">
              <p className="text-lg font-semibold">Nothing saved yet</p>
              <p className="text-sm text-muted-foreground">
                Tap the heart on any product to keep an eye on it.
              </p>
            </div>
            <Link to="/" className={buttonVariants({ variant: 'brand', size: 'lg' })}>
              Browse drops
            </Link>
          </div>
        )}

        {items && items.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
