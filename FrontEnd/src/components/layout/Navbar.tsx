import { Link, NavLink } from 'react-router';
import { ShoppingCart, Package, LogOut } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/features/auth/useAuth';
import { useLogout } from '@/features/auth/useLogout';
import { useCart } from '@/features/cart/useCart';

// Shared header for the browsing pages. Checkout/payment pages keep their own
// minimal header (the payment page has the countdown + cancel button).
export function Navbar() {
  const user = useCurrentUser();
  const logout = useLogout();
  const { data: cart } = useCart();

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Link to="/" className="text-xl font-bold tracking-tight">
          Rushly
        </Link>

        <nav aria-label="Main" className="flex items-center gap-2">
          <NavLink
            to="/orders"
            className={({ isActive }) =>
              cn(buttonVariants({ variant: 'ghost', size: 'sm' }), isActive && 'bg-muted')
            }
          >
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">My orders</span>
          </NavLink>

          <Link
            to="/cart"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
            aria-label={`Cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 && (
              <span className="rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5 font-medium">
                {itemCount}
              </span>
            )}
          </Link>

          {user && (
            <span className="text-sm text-muted-foreground hidden md:inline px-2">{user.name}</span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </header>
  );
}
