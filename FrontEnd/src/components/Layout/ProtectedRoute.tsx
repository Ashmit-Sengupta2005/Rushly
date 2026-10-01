import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth, useIsAuthenticated } from '@/features/auth/useAuth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const isBootstrapped = useAuth((s) => s.isBootstrapped);
  const location = useLocation();

  // Wait for the initial /auth/refresh to resolve — otherwise refreshing the
  // page on a protected route would kick an authenticated user to /login.
  if (!isBootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}