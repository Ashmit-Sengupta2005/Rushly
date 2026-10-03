import { useEffect, useState } from 'react';
import {
  Backpack,
  Footprints,
  Gift,
  Headphones,
  LayoutGrid,
  Search,
  Shirt,
  Snowflake,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategories } from './useCategories';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  shoes: Footprints,
  't-shirts': Shirt,
  hoodies: Snowflake,
  accessories: Backpack,
  goodies: Gift,
  tech: Headphones,
};

// Preferred chip order; categories not listed here go last, alphabetically
const CATEGORY_ORDER = ['shoes', 't-shirts', 'hoodies', 'accessories', 'goodies', 'tech'];
const rank = (slug: string) => {
  const i = CATEGORY_ORDER.indexOf(slug);
  return i === -1 ? CATEGORY_ORDER.length : i;
};

const SEARCH_DEBOUNCE_MS = 300;

interface CatalogToolbarProps {
  search: string;
  category: string | undefined;
  onSearchChange: (value: string) => void;
  onCategoryChange: (slug: string | undefined) => void;
}

// Search box + category chips. The parent owns the values (they live in the URL);
// typing is debounced so we don't fire a request per keystroke.
export function CatalogToolbar({
  search,
  category,
  onSearchChange,
  onCategoryChange,
}: CatalogToolbarProps) {
  const { data: categories } = useCategories();
  const [draft, setDraft] = useState(search);

  // URL changed from outside (back button, clear filters) → sync the input
  const [prevSearch, setPrevSearch] = useState(search);
  if (search !== prevSearch) {
    setPrevSearch(search);
    setDraft(search);
  }

  useEffect(() => {
    if (draft.trim() === search) return;
    const id = setTimeout(() => onSearchChange(draft.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [draft, search, onSearchChange]);

  const sorted = [...(categories ?? [])].sort(
    (a, b) => rank(a.slug) - rank(b.slug) || a.name.localeCompare(b.name),
  );
  const chips = [{ slug: undefined, name: 'All' }, ...sorted];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search sneakers, tees, hoodies, goodies…"
          aria-label="Search products"
          maxLength={100}
          className="h-12 w-full rounded-2xl border border-input bg-card pl-11 pr-11 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:hidden"
        />
        {draft && (
          <button
            type="button"
            onClick={() => {
              setDraft('');
              onSearchChange('');
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label="Category"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
      >
        {chips.map(({ slug, name }) => {
          const active = category === slug;
          const Icon = slug ? (CATEGORY_ICONS[slug] ?? LayoutGrid) : LayoutGrid;
          return (
            <button
              key={slug ?? 'all'}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onCategoryChange(slug)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'border-transparent bg-foreground text-background shadow-md'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
