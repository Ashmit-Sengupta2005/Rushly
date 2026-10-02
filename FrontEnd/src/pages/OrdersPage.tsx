import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Navbar } from '@/components/layout/Navbar';
import { OrderCard } from '@/features/orders/OrderCard';
import { useOrders } from '@/features/orders/useOrders';
import { buttonVariants } from '@/components/ui/button';

export default function OrdersPage() {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrders();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll — same pattern as the catalog grid
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const orders = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 pb-16">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter mb-8">Your orders</h1>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-destructive text-center py-12">Could not load your orders. Try refreshing.</p>
        )}

        {!isLoading && !isError && orders.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border py-20 text-center animate-fade-up">
            <div className="space-y-1">
              <p className="text-lg font-semibold">No orders yet</p>
              <p className="text-sm text-muted-foreground">When you grab something from a drop, it shows up here.</p>
            </div>
            <Link to="/" className={buttonVariants({ variant: 'brand', size: 'lg' })}>
              Browse drops
            </Link>
          </div>
        )}

        {orders.length > 0 && (
          <>
            <div className="space-y-3">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
            <div ref={sentinelRef} className="h-10" />
            {isFetchingNextPage && (
              <p className="text-center text-sm text-muted-foreground py-4">Loading more…</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
