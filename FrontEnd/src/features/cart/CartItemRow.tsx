import { Minus, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import type { CartItem } from '@/types/api';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/formatMoney';
import { useUpdateCartItem, useRemoveCartItem } from './useCart';

export function CartItemRow({ item }: { item: CartItem }) {
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();

  const busy = update.isPending || remove.isPending;
  const { product } = item;
  const image = product.images[0];
  // Backend caps a line at 100 and rejects more than available stock
  const maxQuantity = Math.min(product.inventory.availableStock, 100);

  return (
    <div className="flex gap-4 py-4 border-b border-border last:border-0">
      <Link
        to={`/products/${product.slug}`}
        className="h-20 w-20 bg-muted rounded-md overflow-hidden flex-shrink-0"
      >
        {image && (
          <img src={image.url} alt={image.alt ?? product.name} className="h-full w-full object-cover" />
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <Link to={`/products/${product.slug}`} className="font-medium text-sm truncate block hover:underline">
          {product.name}
        </Link>
        {/* priceSnapshot is what checkout charges (reservation uses snapshots) */}
        <p className="text-sm font-semibold mt-1">{formatMoney(item.lineTotal)}</p>
        {item.quantity > 1 && (
          <p className="text-xs text-muted-foreground">
            {formatMoney(item.priceSnapshot)} each
          </p>
        )}
        {item.priceChanged && (
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
            Price is now {formatMoney(product.price)} — remove and re-add to update
          </p>
        )}
        {item.outOfStock && (
          <p className="text-xs text-destructive mt-1">
            {product.inventory.availableStock > 0
              ? `Only ${product.inventory.availableStock} left — lower the quantity`
              : 'Out of stock — remove to check out'}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end justify-between">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => remove.mutate(product.id)}
          disabled={busy}
          aria-label={`Remove ${product.name}`}
        >
          <Trash2 />
        </Button>

        <div className="flex items-center gap-1 border border-border rounded-md">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => update.mutate({ productId: product.id, quantity: item.quantity - 1 })}
            disabled={busy || item.quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus />
          </Button>
          <span className="text-sm w-6 text-center tabular-nums" aria-live="polite">
            {item.quantity}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => update.mutate({ productId: product.id, quantity: item.quantity + 1 })}
            disabled={busy || item.quantity >= maxQuantity}
            aria-label="Increase quantity"
          >
            <Plus />
          </Button>
        </div>
      </div>
    </div>
  );
}
