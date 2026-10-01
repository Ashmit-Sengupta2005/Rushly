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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">My orders</h1>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-destructive text-center py-12">Could not load your orders. Try refreshing.</p>
        )}

        {!isLoading && !isError && orders.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">You haven't placed any orders yet.</p>
            <Link to="/" className={buttonVariants()}>
              Browse products
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
