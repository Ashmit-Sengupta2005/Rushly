import { Popover } from '@base-ui/react/popover';
import { useTheme } from 'next-themes';
import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCENTS, useAccent } from './accent';

const MODES = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
] as const;

// Navbar popover: light/dark/system mode + colour theme.
export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="Change theme"
        title="Theme"
        className={cn(
          'inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          className,
        )}
      >
        <Palette className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="w-64 rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-xl outline-none origin-(--transform-origin) transition-[transform,opacity] duration-150 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Mode
            </p>
            <div role="radiogroup" aria-label="Colour mode" className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
              {MODES.map(({ id, label, icon: Icon }) => {
                const active = theme === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTheme(id)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Theme
            </p>
            <div role="radiogroup" aria-label="Colour theme" className="space-y-1">
              {ACCENTS.map(({ id, label, swatch }) => {
                const active = accent === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setAccent(id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active ? 'bg-muted' : 'hover:bg-muted/60',
                    )}
                  >
                    <span
                      aria-hidden
                      className="size-6 rounded-full shadow-sm ring-2 ring-background"
                      style={{ backgroundImage: swatch }}
                    />
                    {label}
                    {active && <Check className="ml-auto size-4" />}
                  </button>
                );
              })}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
