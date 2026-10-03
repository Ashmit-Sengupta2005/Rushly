import { cn } from '@/lib/utils';
import { countdownParts } from './events';

// Big DD:HH:MM:SS tiles for hero/event cards. Days tile only when needed.
export function CountdownBlocks({ ms, className }: { ms: number; className?: string }) {
  const { days, hours, minutes, seconds } = countdownParts(ms);
  const units = [
    ...(days > 0 ? [{ label: 'Days', value: days }] : []),
    { label: 'Hrs', value: hours },
    { label: 'Min', value: minutes },
    { label: 'Sec', value: seconds },
  ];

  return (
    <div className={cn('flex gap-2', className)} role="timer" aria-live="off">
      {units.map(({ label, value }) => (
        <div
          key={label}
          className="min-w-14 rounded-xl bg-white/10 px-2 py-2 text-center ring-1 ring-white/10 backdrop-blur"
        >
          <div className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-white">
            {String(value).padStart(2, '0')}
          </div>
          <div className="text-[0.65rem] font-semibold uppercase tracking-widest text-white/60">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
