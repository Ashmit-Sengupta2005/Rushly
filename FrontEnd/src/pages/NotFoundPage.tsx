import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Logo } from '@/components/layout/Logo';

// Catch-all for unknown URLs — without it React Router renders a blank page.
export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-sm animate-fade-up">
        <Logo />
        <p className="text-8xl font-extrabold tracking-tighter text-brand-gradient">404</p>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">This drop doesn't exist</h1>
          <p className="text-sm text-muted-foreground">
            The page you're looking for has sold out — or never existed.
          </p>
        </div>
        <Link to="/" className={buttonVariants({ variant: 'brand', size: 'lg' })}>
          Back to drops
        </Link>
      </div>
    </div>
  );
}
