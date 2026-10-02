import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { ArrowLeft, ImageOff, Minus, Plus, ShieldCheck, ShoppingBag, Timer } from 'lucide-react';
import { useProduct } from '@/features/catalog/useProduct';
import { useAddToCart } from '@/features/cart/useAddToCart';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatMoney } from '@/lib/formatMoney';
import { cn } from '@/lib/utils';
import { Navbar } from '@/components/layout/Navbar';

const LOW_STOCK_THRESHOLD = 10;

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, isError } = useProduct(slug);
  const addToCart = useAddToCart();
  const [quantity, setQuantity] = useState(1);

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

  const stock = product.inventory?.availableStock ?? 0;
  const soldOut = stock <= 0;
  const lowStock = !soldOut && stock <= LOW_STOCK_THRESHOLD;
  const image = product.images[0];
  // Backend caps a cart line at 100 and rejects more than available stock
  const maxQuantity = Math.min(stock, 100);

  const handleAddToCart = () => {
    addToCart.mutate(
      { productId: product.id, quantity },
      { onSuccess: () => navigate('/cart') },
    );
  };

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

      <main className="max-w-6xl mx-auto px-4 py-6 pb-16 grid md:grid-cols-2 gap-8 lg:gap-14 animate-fade-up">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-muted ring-1 ring-border">
          {image ? (
            <img
              src={image.url}
              alt={image.alt ?? product.name}
              className={cn('h-full w-full object-cover', soldOut && 'grayscale opacity-70')}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <ImageOff className="size-8" aria-label="No image" />
            </div>
          )}
        </div>

        <div className="md:sticky md:top-24 h-fit space-y-7">
          <div className="space-y-3">
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
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter">{product.name}</h1>
            <p className="text-2xl font-bold">{formatMoney(product.price)}</p>
          </div>

          {product.description && (
            <p className="text-[0.95rem] text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          )}

          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
            {!soldOut && (
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
            )}
            <Button
              className="w-full h-12 text-base"
              size="lg"
              variant={soldOut ? 'secondary' : 'brand'}
              disabled={soldOut || addToCart.isPending}
              onClick={handleAddToCart}
            >
              <ShoppingBag className="size-5" />
              {soldOut ? 'Sold out' : addToCart.isPending ? 'Adding…' : 'Add to cart'}
            </Button>
          </div>

          <ul className="grid sm:grid-cols-2 gap-3 text-sm">
            <li className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
              <Timer className="size-4 mt-0.5 text-brand shrink-0" />
              <span className="text-muted-foreground">Items are reserved for you during checkout</span>
            </li>
            <li className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
              <ShieldCheck className="size-4 mt-0.5 text-brand shrink-0" />
              <span className="text-muted-foreground">Secure card payments powered by Stripe</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
