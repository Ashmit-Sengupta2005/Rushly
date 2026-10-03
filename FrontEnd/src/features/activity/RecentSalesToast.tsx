import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, X } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/config/queryClient';
import { useIsAuthenticated } from '@/features/auth/useAuth';
import { cn } from '@/lib/utils';
import type { RecentSalesResponse } from '@/types/api';

const SHOW_MS = 6_000;
const GAP_MS = 14_000;
const DISMISS_KEY = 'rushly-hide-recent-sales';

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return relativeTime.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relativeTime.format(-hours, 'hour');
  return relativeTime.format(-Math.round(hours / 24), 'day');
}

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

// "Someone in Pune bought …" — cycles through REAL recent orders from the API.
// Shows nothing when there are none; never invents activity.
export function RecentSalesToast() {
  const isAuthenticated = useIsAuthenticated();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(readDismissed);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  const { data: sales = [] } = useQuery({
    queryKey: queryKeys.activity.recentSales,
    queryFn: async () => (await apiClient.get<RecentSalesResponse>('/activity/recent-sales')).sales,
    enabled: isAuthenticated && !dismissed,
    refetchInterval: 60_000,
  });

  // Don't distract people mid-checkout or on admin pages
  const suppressed = dismissed || pathname.startsWith('/checkout') || pathname.startsWith('/admin');
  const active = !suppressed && sales.length > 0;

  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    const cycle = (show: boolean) => {
      setVisible(show);
      if (!show) setIndex((i) => i + 1);
      timer = setTimeout(() => cycle(!show), show ? SHOW_MS : GAP_MS);
    };
    timer = setTimeout(() => cycle(true), 4_000); // first one shortly after load
    return () => {
      clearTimeout(timer);
      setVisible(false);
    };
  }, [active]);

  if (!active) return null;
  const sale = sales[index % sales.length]!;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* not persisted — hidden for this page view only */
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed bottom-4 left-4 z-40 w-[min(22rem,calc(100vw-2rem))] transition-all duration-500',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <div className="relative flex items-center gap-3 rounded-2xl border border-border bg-popover/95 p-2.5 pr-9 shadow-2xl shadow-black/30 backdrop-blur">
        <Link to={`/products/${sale.productSlug}`} className="flex min-w-0 flex-1 items-center gap-3">
          <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
            {sale.image ? (
              <img src={sale.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <ShoppingBag className="m-4 size-6 text-muted-foreground" />
            )}
          </span>
          <span className="min-w-0 text-sm">
            <span className="block text-xs text-muted-foreground">
              Someone{sale.city ? ` in ${sale.city}` : ''} just bought
            </span>
            <span className="block truncate font-semibold">{sale.productName}</span>
            <span className="block text-xs text-brand">{timeAgo(sale.purchasedAt)}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hide recent purchases"
          className="absolute right-2 top-2 grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
