import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, ImageOff } from 'lucide-react';
import type { ProductListItem } from '@/types/api';
import { formatMoney } from '@/lib/formatMoney';
import { cn } from '@/lib/utils';

// At or below this, show an urgency badge
const LOW_STOCK_THRESHOLD = 10;

export function ProductCard({ product }: { product: ProductListItem }) {
  // The list endpoint only returns inventory.availableStock (not totalStock).
  // Missing inventory row → treat as sold out rather than purchasable.
  const stock = product.inventory?.availableStock ?? 0;
  const soldOut = stock <= 0;
  const lowStock = !soldOut && stock <= LOW_STOCK_THRESHOLD;
  // List endpoint returns at most one image (the first by position)
  const image = product.images[0];
  // Bad/expired image URLs fall back to the placeholder instead of a broken icon
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link
      // Backend detail lookup is by slug: GET /api/products/:slug
      to={`/products/${product.slug}`}
      className="group block rounded-2xl bg-card p-2 ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-foreground/5 hover:ring-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
        {image && !imageFailed ? (
          <img
            src={image.url}
            alt={image.alt ?? product.name}
            className={cn(
              'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105',
              soldOut && 'grayscale opacity-70',
            )}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="size-6" aria-label="No image" />
          </div>
        )}

        {soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-foreground/90 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-background backdrop-blur">
            Sold out
          </span>
        )}
        {lowStock && (
          <span className="absolute left-2 top-2 rounded-full bg-brand-gradient px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-white shadow-md">
            Only {stock} left
          </span>
        )}

        <span
          aria-hidden
          className="absolute right-2 bottom-2 grid size-9 place-items-center rounded-full bg-background/90 text-foreground opacity-0 translate-y-2 shadow-md backdrop-blur transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0"
        >
          <ArrowUpRight className="size-4" />
        </span>
      </div>

      <div className="px-2 pt-3 pb-2 space-y-1">
        {product.category && (
          <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted-foreground">
            {product.category.name}
          </p>
        )}
        <h3 className="font-medium text-sm truncate">{product.name}</h3>
        <p className={cn('text-base font-bold', soldOut && 'text-muted-foreground line-through')}>
          {formatMoney(product.price)}
        </p>
      </div>
    </Link>
  );
}
