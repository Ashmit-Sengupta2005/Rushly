import { Link } from 'react-router';
import type { ProductListItem } from '@/types/api';
import { formatMoney } from '@/lib/formatMoney';

export function ProductCard({ product }: { product: ProductListItem }) {
  // The list endpoint only returns inventory.availableStock (not totalStock).
  // Missing inventory row → treat as sold out rather than purchasable.
  const soldOut = (product.inventory?.availableStock ?? 0) <= 0;
  // List endpoint returns at most one image (the first by position)
  const image = product.images[0];

  return (
    <Link
      // Backend detail lookup is by slug: GET /api/products/:slug
      to={`/products/${product.slug}`}
      className="group block rounded-lg border border-border overflow-hidden hover:border-foreground/40 transition-colors"
    >
      <div className="aspect-square bg-muted overflow-hidden">
        {image ? (
          <img
            src={image.url}
            alt={image.alt ?? product.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}
      </div>
      <div className="p-4 space-y-1">
        <h3 className="font-medium text-sm truncate">{product.name}</h3>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{formatMoney(product.price)}</p>
          {soldOut && (
            <span className="text-xs text-destructive font-medium">Sold out</span>
          )}
        </div>
      </div>
    </Link>
  );
}
