import { Link } from 'react-router';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { useNow } from './useNow';
import { CountdownBlocks } from './CountdownBlocks';
import { formatDayLabel, formatTime, getSpotlight } from './events';

// Hero card: the live flash sale (ends-in countdown) or the next one (starts-in).
// Designed for the dark hero panel.
export function EventSpotlight() {
  const now = useNow();
  const spotlight = getSpotlight(now);
  if (!spotlight) return null;

  const { event, start, end, status } = spotlight;
  const live = status === 'live';

  return (
    <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/15 bg-white/5 backdrop-blur">
      <img
        src={event.image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-35"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/30" aria-hidden />

      <div className="relative space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span
            className={
              live
                ? 'inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-white'
                : 'inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-white/80'
            }
          >
            {live && <span className="size-1.5 rounded-full bg-white animate-pulse" />}
            {live ? 'Live now' : 'Up next'}
          </span>
          <span className="text-xs text-white/60">{event.categoryName}</span>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white">{event.title}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
            <CalendarClock className="size-3.5" />
            {live
              ? `Ends ${formatDayLabel(end, now).toLowerCase()} at ${formatTime(end)} IST`
              : `Starts ${formatDayLabel(start, now).toLowerCase()} at ${formatTime(start)} IST`}
          </p>
        </div>

        <div>
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-white/50">
            {live ? 'Sale ends in' : 'Sale starts in'}
          </p>
          <CountdownBlocks ms={(live ? end : start) - now} />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            to={`/?category=${event.categorySlug}#shop`}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-white/90"
          >
            {live ? 'Shop the drop' : 'Preview drop'}
            <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/events"
            className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-white/80 ring-1 ring-white/20 transition hover:bg-white/10 hover:text-white"
          >
            All events
          </Link>
        </div>
      </div>
    </div>
  );
}
