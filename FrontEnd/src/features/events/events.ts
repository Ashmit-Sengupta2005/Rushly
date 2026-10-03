// Flash-sale calendar. Events recur on a fixed weekly schedule in IST, so the
// calendar is always populated without an admin keeping dates up to date.
// categorySlug must match a category from the backend seed — "Shop the drop"
// links filter the catalog by it.

export interface FlashEvent {
  id: string;
  title: string;
  tagline: string;
  categorySlug: string;
  categoryName: string;
  image: string;
  /** IST weekdays it runs on (0 = Sunday). Omit for every day. */
  days?: number[];
  /** Start time in IST, 24h "HH:MM" */
  startTime: string;
  durationMinutes: number;
}

export interface EventOccurrence {
  event: FlashEvent;
  start: number; // epoch ms
  end: number;
  status: 'live' | 'upcoming';
}

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;

export const FLASH_EVENTS: FlashEvent[] = [
  {
    id: 'midnight-sneaker-drop',
    title: 'Midnight Sneaker Drop',
    tagline: 'Limited pairs land at 12 AM sharp. Set an alarm.',
    categorySlug: 'shoes',
    categoryName: 'Shoes',
    image: unsplash('1542291026-7eec264c27ff'),
    startTime: '00:00',
    durationMinutes: 180,
  },
  {
    id: 'lunch-break-tees',
    title: 'Lunch Break Tees',
    tagline: 'Fresh graphic tees for the midday scroll, weekdays only.',
    categorySlug: 't-shirts',
    categoryName: 'T-Shirts',
    image: unsplash('1562157873-818bc0726f68'),
    days: [1, 2, 3, 4, 5],
    startTime: '13:00',
    durationMinutes: 120,
  },
  {
    id: 'golden-hour-goodies',
    title: 'Golden Hour Goodies',
    tagline: 'Mugs, totes, stickers and desk merch. Small prices, fast sell-outs.',
    categorySlug: 'goodies',
    categoryName: 'Goodies',
    image: unsplash('1572375992501-4b0892d50c69'),
    startTime: '18:00',
    durationMinutes: 120,
  },
  {
    id: 'tech-tuesday',
    title: 'Tech Tuesday',
    tagline: 'Headphones, wearables and speakers in a four-hour window.',
    categorySlug: 'tech',
    categoryName: 'Tech',
    image: unsplash('1505740420928-5e560c06d30e'),
    days: [2],
    startTime: '20:00',
    durationMinutes: 240,
  },
  {
    id: 'accessories-after-dark',
    title: 'Accessories After Dark',
    tagline: 'Caps, shades and bags drop every Friday night.',
    categorySlug: 'accessories',
    categoryName: 'Accessories',
    image: unsplash('1572635196237-14b3f281503f'),
    days: [5],
    startTime: '21:00',
    durationMinutes: 180,
  },
  {
    id: 'weekend-outerwear-vault',
    title: 'Weekend Outerwear Vault',
    tagline: 'Hoodies and jackets. The vault stays open all weekend.',
    categorySlug: 'hoodies',
    categoryName: 'Hoodies & Jackets',
    image: unsplash('1509942774463-acf339cf87d5'),
    days: [6],
    startTime: '10:00',
    durationMinutes: 36 * 60, // Sat 10 AM → Sun 10 PM
  },
];

export const TIME_ZONE = 'Asia/Kolkata';
// IST has no daylight saving, so a fixed offset is exact
const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

/** Occurrences of one event that overlap [from, to). */
function occurrencesBetween(event: FlashEvent, from: number, to: number): EventOccurrence[] {
  const [hh, mm] = event.startTime.split(':').map(Number);
  const duration = event.durationMinutes * 60_000;
  const result: EventOccurrence[] = [];
  // Walk IST calendar days, starting early enough to catch a multi-day event already running
  const firstDay = Math.floor((from + IST_OFFSET_MS - duration) / DAY_MS) - 1;
  const lastDay = Math.floor((to + IST_OFFSET_MS) / DAY_MS);
  for (let day = firstDay; day <= lastDay; day++) {
    // Day 0 of the Unix epoch was a Thursday (4)
    const weekday = (day + 4) % 7;
    if (event.days && !event.days.includes(weekday)) continue;
    const start = day * DAY_MS + (hh! * 60 + mm!) * 60_000 - IST_OFFSET_MS;
    const end = start + duration;
    if (end <= from || start >= to) continue;
    result.push({ event, start, end, status: start <= from ? 'live' : 'upcoming' });
  }
  return result;
}

/** Every live or upcoming occurrence in the next `days` days, soonest first. */
export function getSchedule(now: number, days = 7): EventOccurrence[] {
  return FLASH_EVENTS.flatMap((e) => occurrencesBetween(e, now, now + days * DAY_MS)).sort(
    (a, b) => a.start - b.start,
  );
}

export function getLiveEvents(now: number) {
  return getSchedule(now, 1)
    .filter((o) => o.status === 'live')
    .sort((a, b) => a.end - b.end);
}

/** The live event ending soonest, otherwise the next one to start. */
export function getSpotlight(now: number): EventOccurrence | undefined {
  return getLiveEvents(now)[0] ?? getSchedule(now).find((o) => o.status === 'upcoming');
}

/** Live (or next) occurrence for a category, for product-page banners. */
export function getCategoryEvent(categorySlug: string, now: number) {
  return getSchedule(now).find((o) => o.event.categorySlug === categorySlug);
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
