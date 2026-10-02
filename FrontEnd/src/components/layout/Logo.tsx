import { Link } from 'react-router';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// Brand mark: gradient bolt tile + wordmark. `inverted` for dark panels.
export function Logo({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2 group/logo', className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-brand-gradient shadow-md shadow-brand/30 transition-transform group-hover/logo:-rotate-6">
        <Zap className="size-4 fill-white text-white" />
      </span>
      <span
        className={cn(
          'text-xl font-extrabold tracking-tighter',
          inverted ? 'text-white' : 'text-foreground',
        )}
      >
        Rushly
      </span>
    </Link>
  );
}
