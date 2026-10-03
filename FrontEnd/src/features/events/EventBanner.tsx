import { Link } from 'react-router';
import { CalendarClock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNow } from './useNow';
import { formatCountdown, formatDayLabel, formatTime, getCategoryEvent } from './events';

// Product-page strip: "Part of <event> — ends in …" or "Next drop: … starts in …".
export function EventBanner({ categorySlug }: { categorySlug: string }) {
  const now = useNow();
  const occurrence = getCategoryEvent(categorySlug, now);
  if (!occurrence) return null;

  const { event, start, end, status } = occurrence;
  const live = status === 'live';

  return (
    <Link
      to="/events"
      className={cn(
        'flex items-center gap-3 rounded-2xl border p-3 text-sm transition-colors',
        live
          ? 'border-brand/30 bg-brand/10 hover:bg-brand/15'
          : 'border-border bg-muted/50 hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-xl',
          live ? 'bg-brand-gradient text-white' : 'bg-card text-muted-foreground',
        )}
      >
        {live ? <Zap className="size-4 fill-white" /> : <CalendarClock className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate">
          {live ? `Live: ${event.title}` : `Next drop: ${event.title}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {live
            ? `Ends at ${formatTime(end)} IST`
            : `${formatDayLabel(start, now)} at ${formatTime(start)} IST`}
        </p>
      </div>
      <span className={cn('font-mono text-sm font-semibold tabular-nums', live && 'text-brand')}>
        {formatCountdown((live ? end : start) - now)}
      </span>
    </Link>
  );
}
