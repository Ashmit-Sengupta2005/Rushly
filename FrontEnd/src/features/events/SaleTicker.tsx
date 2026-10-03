import { Link } from 'react-router';
import { ArrowRight, Clock } from 'lucide-react';
import { useNow } from './useNow';
import { formatClock, formatCountdown, formatDate, getSpotlight } from './events';

// Thin strip above the navbar: the live (or next) flash sale with a countdown,
// plus the current IST time.
export function SaleTicker() {
  const now = useNow();
  const spotlight = getSpotlight(now);

  return (
    <div className="relative overflow-hidden bg-zinc-950 text-white border-b border-white/10">
      <div className="absolute inset-0 bg-brand-gradient opacity-15" aria-hidden />
      <div className="relative max-w-6xl mx-auto px-4 h-9 flex items-center justify-between gap-4 text-xs">
        {spotlight && (
          <Link
            to={`/?category=${spotlight.event.categorySlug}#shop`}
            className="group flex min-w-0 items-center gap-2 font-medium"
          >
            {spotlight.status === 'live' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-widest">
                <span className="size-1.5 rounded-full bg-white animate-pulse" />
                Live
              </span>
            ) : (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-widest text-white/80">
                Next
              </span>
            )}
            <span className="truncate">{spotlight.event.title}</span>
            <span className="hidden sm:inline text-white/60">
              {spotlight.status === 'live' ? 'ends in' : 'starts in'}
            </span>
            <span className="font-mono tabular-nums text-white">
              {formatCountdown((spotlight.status === 'live' ? spotlight.end : spotlight.start) - now)}
            </span>
            <ArrowRight className="hidden sm:block size-3.5 text-white/60 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
          </Link>
        )}
        <Link
          to="/events"
          className="hidden md:flex shrink-0 items-center gap-1.5 text-white/70 hover:text-white tabular-nums"
          title="Flash sale calendar"
        >
          <Clock className="size-3.5" />
          {formatDate(now)} · {formatClock(now)} IST
        </Link>
      </div>
    </div>
  );
}
