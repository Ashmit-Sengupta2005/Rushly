import { prisma } from "../../config/prisma.js";
import { errors } from "../../utils/Errors.js";
import { cacheService, cacheKeys } from "../../utils/cache.service.js";
import { liveWindow, nextWindow, windowsBetween } from "./Events.schedule.js";

const DAY_MS = 86_400_000;

// Event rules change rarely (admin/seed only), and every add-to-cart and
// checkout consults them — so cache the rules, compute windows per request.
async function loadActiveEvents(): Promise<EventRow[]> {
  const cached = await cacheService.get<EventRow[]>(cacheKeys.activeEvents());
  if (cached) return cached;
  const events: EventRow[] = await prisma.flashEvent.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      title: true,
      tagline: true,
      image: true,
      daysOfWeek: true,
      startTime: true,
      durationMinutes: true,
      categoryId: true,
      category: { select: { slug: true, name: true } },
    },
  });
  await cacheService.set(cacheKeys.activeEvents(), events, 300);
  return events;
}

interface EventRow {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  image: string;
  daysOfWeek: number[];
  startTime: string;
  durationMinutes: number;
  categoryId: string;
  category: { slug: string; name: string };
}

function toPublic(event: EventRow) {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    tagline: event.tagline,
    image: event.image,
    categorySlug: event.category.slug,
    categoryName: event.category.name,
  };
}

export const eventsService = {
  /**
   * Live and upcoming occurrences over the next `days` days, soonest first.
   * Clients derive live/upcoming from start/end and their own clock, so the
   * response can be cached briefly without countdowns drifting.
   */
  async listSchedule(days: number) {
    const now = Date.now();
    const events = await loadActiveEvents();
    const occurrences = events
      .flatMap((event) =>
        windowsBetween(event, now, now + days * DAY_MS).map((w) => ({
          event: toPublic(event),
          start: w.start.toISOString(),
          end: w.end.toISOString(),
        })),
      )
      .sort((a, b) => a.start.localeCompare(b.start));
    return { serverTime: new Date(now).toISOString(), occurrences };
  },

  /**
   * Throws DROP_NOT_LIVE if any drop-exclusive product's category has no live
   * event right now. Products in categories without events are never gated.
   * Called from add-to-cart (early feedback) and reservation (enforcement).
   */
  async assertPurchasable(
    products: Array<{ id: string; name: string; categoryId: string | null; isDropExclusive: boolean }>,
  ) {
    const gated = products.filter((p) => p.isDropExclusive && p.categoryId);
    if (gated.length === 0) return;

    const now = Date.now();
    const events = await loadActiveEvents();
    for (const product of gated) {
      const categoryEvents = events.filter((e) => e.categoryId === product.categoryId);
      if (categoryEvents.length === 0) continue;
      if (categoryEvents.some((e) => liveWindow(e, now))) continue;

      const next = categoryEvents
        .map((e) => ({ event: e, window: nextWindow(e, now) }))
        .filter((n) => n.window)
        .sort((a, b) => a.window!.start.getTime() - b.window!.start.getTime())[0];
      throw errors.conflict(
        'DROP_NOT_LIVE',
        next
          ? `${product.name} is a drop exclusive — it unlocks when ${next.event.title} goes live`
          : `${product.name} is a drop exclusive and isn't on sale right now`,
        { productId: product.id, opensAt: next?.window!.start.toISOString() ?? null },
      );
    }
  },
};
