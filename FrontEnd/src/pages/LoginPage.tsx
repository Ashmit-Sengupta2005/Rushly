import { Navigate } from 'react-router';
import { LoginForm } from '@/features/auth/LoginForm';
import { useAuth, useIsAuthenticated } from '@/features/auth/useAuth';

export default function LoginPage() {
  const isAuthenticated = useIsAuthenticated();
  const isBootstrapped = useAuth((s) => s.isBootstrapped);

  // Avoid flashing the login form while the bootstrap refresh is in flight
  if (!isBootstrapped) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your Rushly account
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}