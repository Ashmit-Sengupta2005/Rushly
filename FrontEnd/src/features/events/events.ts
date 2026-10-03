// Flash-sale calendar helpers. The schedule comes from GET /api/events (see
// useEvents.ts) as concrete [start, end) windows; live/upcoming is derived
// here from the ticking clock so countdowns flip state without refetching.
import type { EventOccurrenceDto, FlashEventInfo, ProductListItem } from '@/types/api';

export interface EventOccurrence {
  event: FlashEventInfo;
  start: number; // epoch ms
  end: number;
  status: 'live' | 'upcoming';
}

export const TIME_ZONE = 'Asia/Kolkata';
const DAY_MS = 86_400_000;

/** Live or upcoming occurrences within the next `days` days, soonest first. */
export function getSchedule(raw: EventOccurrenceDto[], now: number, days = 7): EventOccurrence[] {
  return raw
    .map((o) => ({ event: o.event, start: Date.parse(o.start), end: Date.parse(o.end) }))
    .filter((o) => o.end > now && o.start < now + days * DAY_MS)
    .map((o) => ({ ...o, status: o.start <= now ? ('live' as const) : ('upcoming' as const) }))
    .sort((a, b) => a.start - b.start);
}

export function getLiveEvents(raw: EventOccurrenceDto[], now: number) {
  return getSchedule(raw, now)
    .filter((o) => o.status === 'live')
    .sort((a, b) => a.end - b.end);
}

/** The live event ending soonest, otherwise the next one to start. */
export function getSpotlight(raw: EventOccurrenceDto[], now: number): EventOccurrence | undefined {
  return getLiveEvents(raw, now)[0] ?? getSchedule(raw, now).find((o) => o.status === 'upcoming');
}

/** Live (or next) occurrence for a category, for product-page banners. */
export function getCategoryEvent(raw: EventOccurrenceDto[], categorySlug: string, now: number) {
  return getSchedule(raw, now, 14).find((o) => o.event.categorySlug === categorySlug);
}

/**
 * Mirrors the backend's DROP_NOT_LIVE rule: a drop exclusive is locked unless
 * an event for its category is live. Returns the occurrence that unlocks it,
 * or null when it can be bought now. The server re-checks at checkout.
 */
export function getDropLock(product: ProductListItem, raw: EventOccurrenceDto[], now: number) {
  if (!product.isDropExclusive || !product.category) return null;
  const next = getCategoryEvent(raw, product.category.slug, now);
  if (!next || next.status === 'live') return null;
  return next;
}

// ------------------------------------------------------------
// Formatting (always shown in IST, whatever the viewer's zone)
// ------------------------------------------------------------
const timeFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const dateFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const clockFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }); // YYYY-MM-DD

export const formatTime = (ms: number) => timeFmt.format(ms).toUpperCase();
export const formatDate = (ms: number) => dateFmt.format(ms);
export const formatClock = (ms: number) => clockFmt.format(ms).toUpperCase();
export const dayKey = (ms: number) => dayKeyFmt.format(ms);

/** "Today" / "Tomorrow" / "Mon, 5 Oct" relative to now, in IST. */
export function formatDayLabel(ms: number, now: number) {
  if (dayKey(ms) === dayKey(now)) return 'Today';
  if (dayKey(ms) === dayKey(now + DAY_MS)) return 'Tomorrow';
  return formatDate(ms);
}

/** Mid-sentence form: "today" / "tomorrow" / "on Mon, 5 Oct". */
export function formatDayPhrase(ms: number, now: number) {
  const label = formatDayLabel(ms, now);
  return label === 'Today' || label === 'Tomorrow' ? label.toLowerCase() : `on ${label}`;
}

/** Splits a duration into countdown parts. Never negative. */
export function countdownParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "2d 04:12:09" or "04:12:09" */
export function formatCountdown(ms: number) {
  const { days, hours, minutes, seconds } = countdownParts(ms);
  const hms = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return days > 0 ? `${days}d ${hms}` : hms;
}

/** Prefilled Google Calendar "add event" link. */
export function googleCalendarUrl(o: EventOccurrence) {
  const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]|\.\d{3}/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Rushly: ${o.event.title}`,
    dates: `${stamp(o.start)}/${stamp(o.end)}`,
    details: `${o.event.tagline}\n\nShop the drop: ${window.location.origin}/?category=${o.event.categorySlug}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
