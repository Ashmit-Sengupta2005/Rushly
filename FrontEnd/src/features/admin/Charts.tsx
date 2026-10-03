import { useState } from 'react';
import { formatCompactMoney, formatMoney } from '@/lib/formatMoney';
import type { RevenueDay } from '@/types/api';

// Hand-rolled HTML charts (no chart library). Single-series, so one brand hue,
// no legend box (the card title names the series). Specs: columns ≤ 24px,
// 4px rounded data-end, 2px gaps, hairline gridlines, per-mark hover tooltip.


const dayFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const formatDay = (day: string) => dayFmt.format(new Date(`${day}T00:00:00Z`));

/** Round a max up to a clean axis top and return 4 evenly spaced ticks. */
function niceTicks(max: number) {
  if (max <= 0) return [0, 1, 2, 3, 4].map((i) => i * 100_000); // no sales yet: ₹0–₹4K scale
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough)!;
  return [0, 1, 2, 3, 4].map((i) => i * step);
}

export function RevenueColumns({ data }: { data: RevenueDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const ticks = niceTicks(Math.max(...data.map((d) => d.revenuePaise), 0));
  const top = ticks[ticks.length - 1]!;
  const peak = data.reduce((best, d, i) => (d.revenuePaise > (data[best]?.revenuePaise ?? -1) ? i : best), 0);
  const labelEvery = Math.ceil(data.length / 6);

  return (
    <div className="pt-3">
      <div className="flex gap-3">
        {/* Y axis */}
        <div className="relative h-56 w-12 shrink-0 text-right text-[0.7rem] tabular-nums text-muted-foreground">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
              {formatCompactMoney(t)}
            </span>
          ))}
        </div>

        <div className="relative h-56 flex-1">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 h-px bg-border"
              style={{ bottom: `${(t / top) * 100}%` }}
              aria-hidden
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-0.5" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => {
              const pct = (d.revenuePaise / top) * 100;
              return (
                // Hit target = the whole column slot, not just the bar
                <div
                  key={d.day}
                  className="relative flex h-full flex-1 items-end justify-center"
                  onMouseEnter={() => setHover(i)}
                >
                  <div
                    className="w-full max-w-6 rounded-t bg-brand transition-opacity"
                    style={{
                      height: `${pct}%`,
                      minHeight: d.revenuePaise > 0 ? 2 : 0,
                      opacity: hover === null || hover === i ? 1 : 0.45,
                    }}
                  />
                  {i === peak && d.revenuePaise > 0 && hover === null && (
                    <span
                      className="absolute -translate-y-full whitespace-nowrap pb-1 text-[0.7rem] font-semibold tabular-nums"
                      style={{ bottom: `${pct}%` }}
                    >
                      {formatCompactMoney(d.revenuePaise)}
                    </span>
                  )}
                  {hover === i && (
                    <div
                      className="pointer-events-none absolute z-10 mb-2 w-max -translate-y-full rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl"
                      style={{ bottom: `${pct}%` }}
                    >
                      <p className="font-semibold">{formatDay(d.day)}</p>
                      <p className="tabular-nums">{formatMoney(d.revenuePaise)}</p>
                      <p className="text-muted-foreground">
                        {d.orderCount} {d.orderCount === 1 ? 'order' : 'orders'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* X axis */}
      <div className="ml-15 mt-2 flex h-4 gap-0.5 text-[0.7rem] text-muted-foreground" aria-hidden>
        {data.map((d, i) => (
          // Label centred under its column but allowed to overflow the narrow slot
          <span key={d.day} className="relative flex-1">
            {i % labelEvery === 0 && (
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{formatDay(d.day)}</span>
            )}
          </span>
        ))}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
          View as table
        </summary>
        <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-card text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Day</th>
                <th className="px-3 py-2 text-right font-medium">Orders</th>
                <th className="px-3 py-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabular-nums">
              {data.map((d) => (
                <tr key={d.day}>
                  <td className="px-3 py-1.5">{formatDay(d.day)}</td>
                  <td className="px-3 py-1.5 text-right">{d.orderCount}</td>
                  <td className="px-3 py-1.5 text-right">{formatMoney(d.revenuePaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/** Labelled horizontal bars — value at the tip, so it doubles as its own table. */
export function BarList({
  rows,
  empty,
}: {
  rows: { key: string; label: string; value: number; display: string; hint?: string }[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} title={r.hint} className="text-sm">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">{r.display}</span>
          </div>
          <div className="h-2.5 rounded-r bg-muted/60">
            <div className="h-full rounded-r bg-brand" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
