import { useEffect, useRef } from 'react';
import { Loader2, PackageOpen } from 'lucide-react';
import { useProducts } from './useProducts';
import { ProductCard } from './ProductCard';

const gridClass = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6';

export function ProductGrid() {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProducts();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '400px' },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-card p-2 ring-1 ring-border">
            <div className="aspect-[4/5] bg-muted animate-pulse rounded-xl" />
            <div className="px-2 pt-3 pb-2 space-y-2">
              <div className="h-3.5 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 py-12 text-center text-destructive">
        Could not load products. Try refreshing.
      </div>
    );
  }

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
        <PackageOpen className="size-8 text-muted-foreground mb-1" />
        <p className="font-medium">No drops right now</p>
        <p className="text-sm text-muted-foreground">Check back soon — new releases land often.</p>
      </div>
    );
  }

  return (
    <>
      <div className={gridClass}>
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      <div ref={sentinelRef} className="h-10" />
      {isFetchingNextPage && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="size-4 animate-spin" />
          Loading more…
        </p>
      )}
    </>
  );
}
