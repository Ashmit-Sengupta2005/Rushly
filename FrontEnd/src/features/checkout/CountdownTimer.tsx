import { useEffect, useRef, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  /** Server's reservation.expiresAt (ISO). Never a local "10:00" timer. */
  expiresAt: string;
  /** Called once when the hold runs out (including if already expired on mount). */
  onExpire?: () => void;
}

const secondsUntil = (iso: string) =>
  Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));

export function CountdownTimer({ expiresAt, onExpire }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(expiresAt));

  // Keep the latest callback in a ref so an inline `onExpire={() => …}` from the
  // parent doesn't restart the interval on every render.
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    let fired = false;
    const tick = () => {
      const remaining = secondsUntil(expiresAt);
      setSecondsLeft(remaining);
      if (remaining === 0 && !fired) {
        fired = true;
        clearInterval(id);
        onExpireRef.current?.();
      }
    };
    const id = setInterval(tick, 1000);
    tick(); // fire immediately if the page was opened after expiry
    return () => clearInterval(id);
  }, [expiresAt]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const expired = secondsLeft === 0;
  const urgent = !expired && secondsLeft < 60;
  const Icon = expired || urgent ? AlertCircle : Clock;

  return (
    <div
      role="timer"
      aria-live={urgent ? 'assertive' : 'off'}
      className={cn(
        'flex items-center gap-2 text-sm font-medium tabular-nums',
        expired || urgent ? 'text-destructive' : 'text-muted-foreground',
      )}
    >
      <Icon className="h-4 w-4" />
      <span>
        {expired ? 'Hold expired' : `Items held for ${minutes}:${seconds.toString().padStart(2, '0')}`}
      </span>
    </div>
  );
}
