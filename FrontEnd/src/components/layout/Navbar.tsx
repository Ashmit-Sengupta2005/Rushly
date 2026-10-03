import { Link, NavLink } from 'react-router';
import { ShoppingBag, Package, LogOut, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/features/auth/useAuth';
import { useLogout } from '@/features/auth/useLogout';
import { useCart } from '@/features/cart/useCart';
import { ThemeSwitcher } from '@/features/theme/ThemeSwitcher';
import { Logo } from './Logo';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-foreground text-background'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
  );

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

// Shared header for the browsing pages. Checkout/payment pages keep their own
// minimal header (the payment page has the countdown + cancel button).
export function Navbar() {
  const user = useCurrentUser();
  const logout = useLogout();
  const { data: cart } = useCart();

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <NavLink to="/" end className={navLinkClass}>
            <Sparkles className="size-4" />
            <span className="hidden sm:inline">Drops</span>
          </NavLink>
          <NavLink to="/orders" className={navLinkClass}>
            <Package className="size-4" />
            <span className="hidden sm:inline">Orders</span>
          </NavLink>

          <ThemeSwitcher />

          <Link
            to="/cart"
            className="relative inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-xs transition hover:-translate-y-px hover:shadow-md"
            aria-label={`Cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
          >
            <ShoppingBag className="size-4" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-brand-gradient text-[0.7rem] font-bold text-white shadow-sm ring-2 ring-background">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>

          {user && (
            <div className="hidden md:flex items-center gap-2 pl-2 ml-1 border-l border-border">
              <span
                aria-hidden
                className="grid size-8 place-items-center rounded-full bg-foreground text-background text-xs font-semibold"
              >
                {initials(user.name)}
              </span>
              <span className="text-sm font-medium max-w-32 truncate">{user.name}</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="size-4" />
          </Button>
        </nav>
      </div>
    </header>
  );
}
