import { Fragment } from 'react';
import { Zap } from 'lucide-react';

const ITEMS = [
  'Free shipping on every order',
  'Checkout holds your items for 10 minutes',
  'Flash drops every day — check the Events calendar',
  'Live inventory — zero oversells',
  'Secure payments by Stripe',
  'Drop exclusives unlock only while their sale is live',
  '175+ products across six categories',
];

// Scrolling announcement strip. Content is duplicated so the loop is seamless;
// the copy is hidden from screen readers.
export function Marquee() {
  return (
    <div className="relative -mx-4 overflow-hidden border-y border-border bg-card/50 py-3 sm:mx-0 sm:rounded-2xl sm:border">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
            {ITEMS.map((item) => (
              <Fragment key={item}>
                <span className="whitespace-nowrap px-6 text-sm font-medium uppercase tracking-widest text-muted-foreground">
                  {item}
                </span>
                <Zap className="size-3.5 shrink-0 fill-brand text-brand" />
              </Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
