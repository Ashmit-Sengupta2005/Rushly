import { Link } from 'react-router';
import { ShoppingCart, LogOut } from 'lucide-react';
import { ProductGrid } from '@/features/catalog/ProductGrid';
import { Button, buttonVariants } from '@/components/ui/button';
import { useLogout } from '@/features/auth/useLogout';
import { useCurrentUser } from '@/features/auth/useAuth';
import { useCart } from '@/features/cart/useCart';

export default function CatalogPage() {
  const user = useCurrentUser();
  const logout = useLogout();
  const { data: cart } = useCart();

  const itemCount =
    cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Rushly</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.name}
            </span>
            {/* A link styled as a button — not <Link><Button>, which nests a
                <button> inside an <a> (invalid HTML, breaks keyboard focus). */}
            <Link to="/cart" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-2' })}>
              <ShoppingCart className="h-4 w-4" />
              Cart
              {itemCount > 0 && (
                <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">
                  {itemCount}
                </span>
              )}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <ProductGrid />
      </main>
    </div>
  );
}