import { useState, type ReactNode } from 'react';
import { useParams, Link } from 'react-router';
import {
  ArrowLeft,
  BellOff,
  BellRing,
  ChevronDown,
  Heart,
  Lock,
  Minus,
  Plus,
  RotateCcw,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Timer,
  Truck,
} from 'lucide-react';
import { useProduct } from '@/features/catalog/useProduct';
import { ProductRow } from '@/features/catalog/ProductRow';
import { useAddToCart } from '@/features/cart/useAddToCart';
import { useWishlistToggle } from '@/features/wishlist/useWishlist';
import { useRestockAlert } from '@/features/wishlist/useRestockAlert';
import { useNow } from '@/features/events/useNow';
import { useEventSchedule } from '@/features/events/useEvents';
import { formatCountdown, getDropLock } from '@/features/events/events';
import { Button, buttonVariants } from '@/components/ui/button';
import { FadeImage } from '@/components/ui/fade-image';
import { formatMoney } from '@/lib/formatMoney';
import { cn } from '@/lib/utils';
import { Navbar } from '@/components/layout/Navbar';
import { EventBanner } from '@/features/events/EventBanner';
import type { ProductDetail } from '@/types/api';

const LOW_STOCK_THRESHOLD = 10;

// Fit guidance per category. There are no size variants in the catalog, so
// this is advice only — nothing here is selectable.
const FIT_NOTES: Record<string, string> = {
  shoes: 'Runs true to size. If you are between sizes or have wider feet, go half a size up.',
  't-shirts': 'Relaxed, slightly boxy fit. Size down for a closer fit; size up for an oversized look.',
  hoodies: 'Roomy through the body with ribbed cuffs. Take your usual size for a relaxed fit.',
};

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading, isError } = useProduct(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-10">
          <div className="aspect-square bg-muted animate-pulse rounded-3xl" />
          <div className="space-y-4 pt-4">
            <div className="h-8 bg-muted animate-pulse rounded-lg w-2/3" />
            <div className="h-6 bg-muted animate-pulse rounded-lg w-1/4" />
            <div className="h-24 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
          <p className="text-2xl font-bold">Product not found</p>
          <p className="text-sm text-muted-foreground">It may have been removed or the link is wrong.</p>
          <Link to="/" className={buttonVariants({ variant: 'outline' })}>
            Back to drops
          </Link>
        </div>
      </div>
    );
  }

  // key resets gallery/quantity state when navigating between products
  return <ProductDetailView key={product.id} product={product} />;
}

function ProductDetailView({ product }: { product: ProductDetail }) {
  const addToCart = useAddToCart();
  const wishlist = useWishlistToggle(product);
  const restock = useRestockAlert(product.id);
  const now = useNow();
  const schedule = useEventSchedule();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const stock = product.inventory?.availableStock ?? 0;
  const soldOut = stock <= 0;
  const lowStock = !soldOut && stock <= LOW_STOCK_THRESHOLD;
  const image = product.images[activeImage] ?? product.images[0];
  // Backend caps a cart line at 100 and rejects more than available stock
  const maxQuantity = Math.min(stock, 100);
  const lock = getDropLock(product, schedule, now);
  const fitNote = product.category ? FIT_NOTES[product.category.slug] : undefined;

  return (
    <div className="min-h-screen">
      <Navbar />
      {/* Page-level back link (not navigation) stays with the page */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to drops
        </Link>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 pb-16 space-y-16">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-14 animate-fade-up">
          <div className="space-y-3">
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-muted ring-1 ring-border">
              <FadeImage
                key={image?.id}
                src={image?.url}
                alt={image?.alt ?? product.name}
                className={cn('h-full w-full object-cover', soldOut && 'grayscale opacity-70')}
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-3">
                {product.images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={`Show image ${i + 1}`}
                    aria-pressed={img === image}
                    className={cn(
                      'size-20 overflow-hidden rounded-xl bg-muted ring-2 transition outline-none focus-visible:ring-ring',
                      img === image ? 'ring-brand' : 'ring-transparent opacity-70 hover:opacity-100',
                    )}
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="md:sticky md:top-28 h-fit space-y-7">
            <div className="space-y-3">
              {product.category && (
                <Link
                  to={`/?category=${product.category.slug}#shop`}
                  className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  {product.category.name}
                </Link>
              )}
              {/* Stock status pill */}
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                  soldOut && 'bg-muted text-muted-foreground',
                  lowStock && 'bg-brand/10 text-brand',
                  !soldOut && !lowStock && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                )}
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    soldOut ? 'bg-muted-foreground' : lowStock ? 'bg-brand animate-pulse' : 'bg-emerald-500',
                  )}
                />
                {soldOut ? 'Sold out' : lowStock ? `Only ${stock} left — selling fast` : `${stock} in stock`}
              </span>
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter">{product.name}</h1>
                <button
                  type="button"
                  onClick={wishlist.toggle}
                  aria-pressed={wishlist.saved}
                  aria-label={wishlist.saved ? 'Remove from saved' : 'Save for later'}
                  title={wishlist.saved ? 'Saved' : 'Save for later'}
                  className={cn(
                    'grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card transition hover:scale-105',
                    wishlist.saved ? 'text-brand' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Heart className={cn('size-5', wishlist.saved && 'fill-current')} />
                </button>
              </div>
              <p className="text-2xl font-bold">{formatMoney(product.price)}</p>
            </div>

            {product.category && <EventBanner categorySlug={product.category.slug} />}

            {product.description && (
              <p className="text-[0.95rem] text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
              {soldOut ? (
                <>
                  <Button className="w-full h-12 text-base" size="lg" variant="secondary" disabled>
                    Sold out
                  </Button>
                  <Button
                    className="w-full h-11"
                    variant={restock.subscribed ? 'outline' : 'brand'}
                    disabled={restock.isPending}
                    onClick={restock.toggle}
                  >
                    {restock.subscribed ? <BellOff className="size-4" /> : <BellRing className="size-4" />}
                    {restock.subscribed ? "You'll be notified — cancel alert" : "Notify me when it's back"}
                  </Button>
                </>
              ) : lock ? (
                <div className="space-y-2 text-center">
                  <Button className="w-full h-12 text-base" size="lg" variant="secondary" disabled>
                    <Lock className="size-4" />
                    Unlocks in {formatCountdown(lock.start - now)}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Drop exclusive — available only during {lock.event.title}.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Quantity</span>
                    <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-full"
                        aria-label="Decrease quantity"
                        disabled={quantity <= 1}
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      >
                        <Minus />
                      </Button>
                      <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">
                        {quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-full"
                        aria-label="Increase quantity"
                        disabled={quantity >= maxQuantity}
                        onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                      >
                        <Plus />
                      </Button>
                    </div>
                  </div>
                  <Button
                    className="w-full h-12 text-base"
                    size="lg"
                    variant="brand"
                    disabled={addToCart.isPending}
                    onClick={() => addToCart.mutate({ productId: product.id, quantity })}
                  >
                    <ShoppingBag className="size-5" />
                    {addToCart.isPending ? 'Adding…' : 'Add to cart'}
                  </Button>
                </>
              )}
            </div>

            <div className="divide-y divide-border rounded-2xl border border-border bg-card">
              {fitNote && (
                <Accordion icon={<Ruler className="size-4" />} title="Size & fit">
                  {fitNote}
                </Accordion>
              )}
              <Accordion icon={<Truck className="size-4" />} title="Shipping & delivery">
                Free shipping on every order. Orders are dispatched within 2–4 business days.
              </Accordion>
              <Accordion icon={<RotateCcw className="size-4" />} title="Returns & refunds">
                Unworn items can be returned within 7 days of delivery. Refunds go back to your original
                payment method.
              </Accordion>
              <Accordion icon={<Timer className="size-4" />} title="How checkout holds work">
                When you check out, your items are reserved for 10 minutes so nobody else can buy them
                while you pay. If the timer runs out, they go back on sale.
              </Accordion>
              <Accordion icon={<ShieldCheck className="size-4" />} title="Secure payments">
                Card payments are processed by Stripe. Rushly never sees or stores your card number.
              </Accordion>
            </div>
          </div>
        </div>

        {product.category && (
          <ProductRow
            eyebrow={product.category.name}
            title="You might also like"
            filters={{ categorySlug: product.category.slug }}
            excludeId={product.id}
          />
        )}
      </main>
    </div>
  );
}

function Accordion({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <details className="group px-5 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 py-4 text-sm font-semibold">
        <span className="text-brand">{icon}</span>
        {title}
        <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <p className="pb-4 pl-7 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </details>
  );
}
