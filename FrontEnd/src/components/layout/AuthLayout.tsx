import type { ReactNode } from 'react';
import { ShieldCheck, Timer, Zap } from 'lucide-react';
import { Logo } from './Logo';

const highlights = [
  { icon: Zap, title: 'Live drops', body: 'Real-time inventory — what you see is what’s left.' },
  { icon: Timer, title: 'Reserved at checkout', body: 'Your items are held while you pay.' },
  { icon: ShieldCheck, title: 'Secure payments', body: 'Card details handled by Stripe, never by us.' },
];

// Split-screen shell for login/register: brand panel (lg+) + form column.
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-zinc-950 p-12 text-white">
        <div className="absolute inset-0 bg-dot-grid opacity-60" aria-hidden />
        <div
          className="absolute -top-32 -left-24 size-96 rounded-full bg-brand blur-3xl opacity-35"
          aria-hidden
        />
        <div
          className="absolute -bottom-40 -right-20 size-96 rounded-full bg-brand-2 blur-3xl opacity-30"
          aria-hidden
        />

        <Logo inverted className="relative" />

        <div className="relative space-y-10">
          <h2 className="text-5xl font-extrabold leading-[1.05] tracking-tighter">
            The drop waits
            <br />
            for <span className="text-brand-gradient">no one.</span>
          </h2>
          <ul className="space-y-5">
            {highlights.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-5 text-brand" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-white/60">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} Rushly</p>
      </aside>

      {/* Form column */}
      <main className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-8 animate-fade-up">
          <Logo className="lg:hidden" />
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
