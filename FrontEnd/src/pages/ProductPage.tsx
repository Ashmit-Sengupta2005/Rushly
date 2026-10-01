import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { useProduct } from '@/features/catalog/useProduct';
import { useAddToCart } from '@/features/cart/useAddToCart';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatMoney } from '@/lib/formatMoney';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, isError } = useProduct(slug);
  const addToCart = useAddToCart();
  const [quantity, setQuantity] = useState(1);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="aspect-square bg-muted animate-pulse rounded-lg mb-6" />
        <div className="h-6 bg-muted animate-pulse rounded w-1/2 mb-2" />
        <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <p className="text-destructive mb-4">Product not found.</p>
        <Link to="/" className={buttonVariants({ variant: 'outline' })}>
          Back to catalog
        </Link>
      </div>
    );
  }

  const stock = product.inventory?.availableStock ?? 0;
  const soldOut = stock <= 0;
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to catalog
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 grid md:grid-cols-2 gap-8">
        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
          {image ? (
            <img
              src={image.url}
              alt={image.alt ?? product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <p className="text-xl font-semibold mt-2">
              {formatMoney(product.price)}
            </p>
          </div>

          {product.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          )}

          <div className="pt-2">
            {!soldOut ? (
              <p className="text-sm text-muted-foreground mb-3">
                {stock} in stock
              </p>
            ) : (
              <p className="text-sm text-destructive mb-3">Sold out</p>
            )}
            {!soldOut && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm text-muted-foreground">Quantity</span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus />
                </Button>
                <span className="w-8 text-center tabular-nums" aria-live="polite">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Increase quantity"
                  disabled={quantity >= maxQuantity}
                  onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                >
                  <Plus />
                </Button>
              </div>
            )}
            <Button
              className="w-full"
              size="lg"
              disabled={soldOut || addToCart.isPending}
              onClick={handleAddToCart}
            >
              {addToCart.isPending ? 'Adding…' : 'Add to cart'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}