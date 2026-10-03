import { useProducts, type ProductFilters } from './useProducts';
import { ProductCard } from './ProductCard';

// A short horizontal row of products ("You might also like", "Trending now").
export function ProductRow({
  title,
  eyebrow,
  filters = {},
  excludeId,
  limit = 4,
}: {
  title: string;
  eyebrow?: string;
  filters?: ProductFilters;
  excludeId?: string;
  limit?: number;
}) {
  const { data, isLoading } = useProducts(filters);
  const items = (data?.pages[0]?.items ?? [])
    .filter((p) => p.id !== excludeId && (p.inventory?.availableStock ?? 0) > 0)
    .slice(0, limit);

  if (!isLoading && items.length === 0) return null;

  return (
    <section className="space-y-5">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">{eyebrow}</p>
        )}
        <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {isLoading
          ? Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-muted animate-pulse" />
            ))
          : items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
