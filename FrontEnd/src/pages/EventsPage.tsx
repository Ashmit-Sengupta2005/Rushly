import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BellRing, CalendarPlus, Clock, PackageCheck, Timer, Zap } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNow } from '@/features/events/useNow';
import { useEventSchedule } from '@/features/events/useEvents';
import { CountdownBlocks } from '@/features/events/CountdownBlocks';
import {
  dayKey,
  formatClock,
  formatCountdown,
  formatDate,
  formatDayLabel,
  formatDayPhrase,
  formatTime,
  getSchedule,
  googleCalendarUrl,
  type EventOccurrence,
} from '@/features/events/events';

const howItWorks = [
  { icon: BellRing, title: 'Drops open on the clock', body: 'Every event starts at a fixed time in IST. Countdowns update live.' },
  { icon: Timer, title: 'Your cart is held for 10 minutes', body: 'Checkout reserves your items so nobody can buy them while you pay.' },
  { icon: PackageCheck, title: 'No oversells, ever', body: 'Stock is tracked atomically, so if it says in stock, it is.' },
];

export default function EventsPage() {
  const now = useNow();
  const raw = useEventSchedule();
  const schedule = getSchedule(raw, now, 7);
  const live = schedule.filter((o) => o.status === 'live');
  const upcoming = schedule.filter((o) => o.status === 'upcoming');

  // Group upcoming occurrences by IST calendar day
  const days = new Map<string, EventOccurrence[]>();
  for (const o of upcoming) {
    const key = dayKey(o.start);
    days.set(key, [...(days.get(key) ?? []), o]);
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pt-8 pb-16 space-y-12 animate-fade-up">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">Flash sale calendar</p>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tighter">Events &amp; drops</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Every drop is time-boxed. Add the ones you care about to your calendar so you don't miss them.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-xs">
            <Clock className="size-5 text-brand" />
            <div>
              <p className="text-xl font-bold tabular-nums leading-none">{formatClock(now)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(now)} · India Standard Time</p>
            </div>
          </div>
        </header>

        {/* Live now */}
        {live.length > 0 && (
          <section className="space-y-4">
            <SectionTitle dot>Live now</SectionTitle>
            <div className="grid gap-4 lg:grid-cols-2">
              {live.map((o) => (
                <LiveEventCard key={o.event.id + o.start} occurrence={o} now={now} />
              ))}
            </div>
          </section>
        )}

        {/* Schedule */}
        <section className="space-y-6">
          <SectionTitle>Coming up this week</SectionTitle>
          {[...days.entries()].map(([key, occurrences]) => (
            <div key={key} className="grid gap-3 md:grid-cols-[9rem_1fr]">
              <div className="md:pt-4">
                <p className="font-bold">{formatDayLabel(occurrences[0]!.start, now)}</p>
                {/* Today/Tomorrow get the date underneath; other days already show it */}
                {formatDayLabel(occurrences[0]!.start, now) !== formatDate(occurrences[0]!.start) && (
                  <p className="text-xs text-muted-foreground">{formatDate(occurrences[0]!.start)}</p>
                )}
              </div>
              <div className="space-y-3">
                {occurrences.map((o) => (
                  <UpcomingRow key={o.event.id + o.start} occurrence={o} now={now} />
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section className="grid gap-4 sm:grid-cols-3">
          {howItWorks.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
                <Icon className="size-5" />
              </span>
              <p className="mt-4 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function SectionTitle({ children, dot }: { children: ReactNode; dot?: boolean }) {
  return (
    <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
      {dot && (
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-brand" />
        </span>
      )}
      {children}
    </h2>
  );
}

function LiveEventCard({ occurrence, now }: { occurrence: EventOccurrence; now: number }) {
  const { event, start, end } = occurrence;
  const progress = Math.min(100, ((now - start) / (end - start)) * 100);

  return (
    <article className="relative overflow-hidden rounded-3xl bg-zinc-950 text-white ring-1 ring-white/10">
      <img src={event.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-zinc-950/20" aria-hidden />
      <div className="relative space-y-5 p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-widest">
            <Zap className="size-3 fill-white" />
            Live
          </span>
          <span className="text-xs text-white/70">{event.categoryName}</span>
        </div>
        <div>
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{event.title}</h3>
          <p className="mt-1 max-w-md text-sm text-white/70">{event.tagline}</p>
        </div>
        <div>
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-white/50">
            Ends at {formatTime(end)} IST — time left
          </p>
          <CountdownBlocks ms={end - now} />
        </div>
        <div className="max-w-sm">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-white/50">
            Started {formatDayPhrase(start, now)} at {formatTime(start)}
          </p>
        </div>
        <Link
          to={`/?category=${event.categorySlug}#shop`}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-white/90"
        >
          Shop the drop
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}

function UpcomingRow({ occurrence, now }: { occurrence: EventOccurrence; now: number }) {
  const { event, start, end } = occurrence;
  const soon = start - now < 60 * 60_000;

  return (
    <article className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-foreground/15 sm:flex-row sm:items-center">
      <img
        src={event.image}
        alt=""
        loading="lazy"
        className="h-32 w-full rounded-xl object-cover sm:h-20 sm:w-28"
      />
      <div className="min-w-0 flex-1 space-y-1 px-1 sm:px-0">
        <p className="text-xs font-semibold tabular-nums text-brand">
          {formatTime(start)} – {formatTime(end)} IST
          {formatDayLabel(end, now) !== formatDayLabel(start, now) && ` (${formatDate(end)})`}
        </p>
        <h3 className="font-bold">{event.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-1">{event.tagline}</p>
      </div>
      <div className="flex items-center justify-between gap-3 px-1 sm:flex-col sm:items-end sm:px-0">
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold tabular-nums',
            soon ? 'bg-brand/10 text-brand' : 'bg-muted text-muted-foreground',
          )}
        >
          Starts in {formatCountdown(start - now)}
        </span>
        <div className="flex gap-1.5">
          <a
            href={googleCalendarUrl(occurrence)}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'rounded-full' })}
            title="Add to Google Calendar"
          >
            <CalendarPlus className="size-4" />
            <span className="hidden lg:inline">Remind me</span>
          </a>
          <Link
            to={`/?category=${event.categorySlug}#shop`}
            className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'rounded-full' })}
          >
            Preview
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
