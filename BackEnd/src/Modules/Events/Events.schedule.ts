// Pure recurrence math for flash events — no DB, no I/O, easy to unit test.
//
// An event is a weekly rule ("Tuesdays at 20:00 IST for 4h"). This turns the
// rule into concrete [start, end) windows. IST has no daylight saving, so a
// fixed +05:30 offset is exact all year.

export interface RecurrenceRule {
  daysOfWeek: number[]; // 0 = Sunday; empty = every day
  startTime: string; // "HH:MM" IST
  durationMinutes: number;
}

export interface Window {
  start: Date;
  end: Date;
}

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

/** Every window of `rule` that overlaps [from, to), oldest first. */
export function windowsBetween(rule: RecurrenceRule, from: number, to: number): Window[] {
  const [hh, mm] = rule.startTime.split(':').map(Number);
  const duration = rule.durationMinutes * 60_000;
  const windows: Window[] = [];
  // Walk IST calendar days, starting early enough to catch a multi-day window already running
  const firstDay = Math.floor((from + IST_OFFSET_MS - duration) / DAY_MS) - 1;
  const lastDay = Math.floor((to + IST_OFFSET_MS) / DAY_MS);
  for (let day = firstDay; day <= lastDay; day++) {
    const weekday = (day + 4) % 7; // day 0 of the Unix epoch was a Thursday
    if (rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(weekday)) continue;
    const start = day * DAY_MS + (hh! * 60 + mm!) * 60_000 - IST_OFFSET_MS;
    const end = start + duration;
    if (end > from && start < to) windows.push({ start: new Date(start), end: new Date(end) });
  }
  return windows;
}

/** The window containing `now`, if any. */
export function liveWindow(rule: RecurrenceRule, now: number): Window | undefined {
  return windowsBetween(rule, now, now + 1)[0];
}

/** The next window starting after `now`, looking up to two weeks ahead. */
export function nextWindow(rule: RecurrenceRule, now: number): Window | undefined {
  return windowsBetween(rule, now, now + 14 * DAY_MS).find((w) => w.start.getTime() > now);
}
