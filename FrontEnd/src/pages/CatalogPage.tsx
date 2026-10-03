import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { ShieldCheck, Timer, Zap } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { ProductGrid } from '@/features/catalog/ProductGrid';
import { CatalogToolbar } from '@/features/catalog/CatalogToolbar';
import { useCategories } from '@/features/catalog/useCategories';
import { EventSpotlight } from '@/features/events/EventSpotlight';

const perks = [
  { icon: Timer, label: 'Stock held for you at checkout' },
  { icon: ShieldCheck, label: 'Secure payments by Stripe' },
  { icon: Zap, label: 'Live inventory, no oversells' },
];

export default function CatalogPage() {
  // Filters live in the URL (?q=…&category=…) so they survive refresh and are shareable
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? undefined;
  const { data: categories } = useCategories();
  const categoryName = categories?.find((c) => c.slug === category)?.name;

  const location = useLocation();
  const shopRef = useRef<HTMLElement>(null);
  // Event links point at /?category=…#shop — scroll down to the grid
  useEffect(() => {
    if (location.hash === '#shop') shopRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [location.key, location.hash]);

  const updateParam = useCallback(
    (key: 'q' | 'category', value: string | undefined) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        // Typing shouldn't flood the back-button history
        { replace: key === 'q', preventScrollReset: true },
      ),
    [setSearchParams],
  );
  const onSearchChange = useCallback((v: string) => updateParam('q', v), [updateParam]);
  const onCategoryChange = useCallback((v?: string) => updateParam('category', v), [updateParam]);
  const clearFilters = useCallback(() => setSearchParams({}), [setSearchParams]);

  const heading = search
    ? `Results for “${search}”${categoryName ? ` in ${categoryName}` : ''}`
    : (categoryName ?? 'Latest releases');

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pt-6 pb-16 space-y-12">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-zinc-950 ring-1 ring-white/10 px-6 py-10 sm:px-10 sm:py-14 text-white animate-fade-up">
          <div className="absolute inset-0 bg-dot-grid opacity-60" aria-hidden />
          <div
            className="absolute -top-24 -right-16 size-80 rounded-full bg-brand blur-3xl opacity-40"
            aria-hidden
          />
          <div
            className="absolute -bottom-32 left-1/3 size-72 rounded-full bg-brand-2 blur-3xl opacity-30"
            aria-hidden
          />

          <div className="relative grid gap-10 lg:grid-cols-[1fr_minmax(0,24rem)] lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-widest text-white/80 backdrop-blur">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-brand" />
                </span>
                Drops are live
              </span>
              <h1 className="text-4xl sm:text-6xl font-extrabold leading-[1.05] tracking-tighter">
                Limited drops.
                <br />
                <span className="text-brand-gradient">Zero oversells.</span>
              </h1>
              <p className="text-base sm:text-lg text-white/70 max-w-xl">
                Sneakers, tees, hoodies and goodies in timed flash sales. Once you check out, your
                items are reserved for you while you pay.
              </p>
              <ul className="flex flex-wrap gap-2 pt-2">
                {perks.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs sm:text-sm text-white/90 ring-1 ring-white/10"
                  >
                    <Icon className="size-4 text-brand" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            <EventSpotlight />
          </div>
        </section>

        {/* Shop */}
        <section ref={shopRef} id="shop" className="space-y-6 scroll-mt-32">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              Shop the drop
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold">{heading}</h2>
          </div>
          <CatalogToolbar
            search={search}
            category={category}
            onSearchChange={onSearchChange}
            onCategoryChange={onCategoryChange}
          />
          <ProductGrid
            filters={{ search: search || undefined, categorySlug: category }}
            onClearFilters={clearFilters}
          />
        </section>
      </main>
    </div>
  );
}
