import { Link } from 'react-router';
import { Heart, Loader2, Lock, Plus, Zap } from 'lucide-react';
import type { ProductListItem } from '@/types/api';
import { formatMoney } from '@/lib/formatMoney';
import { cn } from '@/lib/utils';
import { FadeImage } from '@/components/ui/fade-image';
import { useAddToCart } from '@/features/cart/useAddToCart';
import { useWishlistToggle } from '@/features/wishlist/useWishlist';
import { useNow } from '@/features/events/useNow';
import { useEventSchedule } from '@/features/events/useEvents';
import { formatDayPhrase, formatTime, getDropLock } from '@/features/events/events';

// At or below this, show an urgency badge
const LOW_STOCK_THRESHOLD = 10;

export function ProductCard({ product }: { product: ProductListItem }) {
  // Missing inventory row → treat as sold out rather than purchasable.
  const stock = product.inventory?.availableStock ?? 0;
  const total = product.inventory?.totalStock ?? 0;
  const soldOut = stock <= 0;
  const lowStock = !soldOut && stock <= LOW_STOCK_THRESHOLD;
  const claimed = total > 0 ? Math.min(100, Math.round(((total - stock) / total) * 100)) : 0;
  // List endpoint returns at most one image (the first by position)
  const image = product.images[0];
  const href = `/products/${product.slug}`;

  const addToCart = useAddToCart();
  const wishlist = useWishlistToggle(product);

  return (
    <div className="group relative rounded-2xl bg-card p-2 ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 hover:ring-foreground/15">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
        <FadeImage
          src={image?.url}
          alt={image?.alt ?? product.name}
          loading="lazy"
          className={cn(
            'h-full w-full object-cover transition-[transform,opacity] duration-500 group-hover:scale-105',
            soldOut && 'grayscale opacity-70',
          )}
        />

        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1.5">
          {soldOut && (
            <span className="rounded-full bg-foreground/90 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-background backdrop-blur">
              Sold out
            </span>
          )}
          {lowStock && (
            <span className="rounded-full bg-brand-gradient px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-white shadow-md">
              Only {stock} left
            </span>
          )}
          {product.isDropExclusive && <DropBadge product={product} />}
        </div>

        <button
          type="button"
          onClick={wishlist.toggle}
          aria-pressed={wishlist.saved}
          aria-label={wishlist.saved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
          className={cn(
            'absolute right-2 top-2 z-10 grid size-9 place-items-center rounded-full bg-background/80 shadow-md backdrop-blur transition-all hover:scale-110',
            wishlist.saved ? 'text-brand' : 'text-foreground/70 hover:text-foreground',
          )}
        >
          <Heart className={cn('size-4', wishlist.saved && 'fill-current')} />
        </button>

        {!soldOut && (
          <button
            type="button"
            onClick={() => addToCart.mutate({ productId: product.id, quantity: 1 })}
            disabled={addToCart.isPending}
            className="absolute inset-x-2 bottom-2 z-10 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-background/90 text-sm font-semibold text-foreground shadow-lg backdrop-blur transition-all duration-300 hover:bg-foreground hover:text-background sm:translate-y-3 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:focus-visible:translate-y-0 sm:focus-visible:opacity-100"
          >
            {addToCart.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Quick add
          </button>
        )}
      </div>

      <div className="px-2 pt-3 pb-2 space-y-1">
        {product.category && (
          <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted-foreground">
            {product.category.name}
          </p>
        )}
        <h3 className="font-medium text-sm truncate">
          {/* Stretched link: the whole card is clickable; the buttons above sit on z-10 */}
          <Link to={href} className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline">
            {product.name}
          </Link>
        </h3>
        <p className={cn('text-base font-bold', soldOut && 'text-muted-foreground line-through')}>
          {formatMoney(product.price)}
        </p>
        {!soldOut && total > 0 && claimed > 0 && (
          <div className="pt-1" title={`${stock} of ${total} left`}>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${claimed}%` }} />
            </div>
            <p className="mt-1 text-[0.7rem] text-muted-foreground">{claimed}% claimed</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Separate component so only exclusive cards subscribe to the 1s clock
function DropBadge({ product }: { product: ProductListItem }) {
  const now = useNow();
  const schedule = useEventSchedule();
  const lock = getDropLock(product, schedule, now);

  return lock ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-950/85 px-2.5 py-1 text-[0.7rem] font-semibold text-white backdrop-blur">
      <Lock className="size-3" />
      Unlocks {formatDayPhrase(lock.start, now)} {formatTime(lock.start)}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-950/85 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-white backdrop-blur">
      <Zap className="size-3 fill-brand text-brand" />
      Drop exclusive
    </span>
  );
}
