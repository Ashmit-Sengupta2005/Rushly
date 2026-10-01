import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';

// Catch-all for unknown URLs — without it React Router renders a blank page.
export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-sm">
        <p className="text-5xl font-bold text-muted-foreground">404</p>
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link to="/" className={buttonVariants()}>
          Back to shop
        </Link>
      </div>
    </div>
  );
}
