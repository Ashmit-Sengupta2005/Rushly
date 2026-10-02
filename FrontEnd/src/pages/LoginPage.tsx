import { Navigate } from 'react-router';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { LoginForm } from '@/features/auth/LoginForm';
import { GoogleSignInButton } from '@/features/auth/GoogleSignInButton';
import { useAuth, useIsAuthenticated } from '@/features/auth/useAuth';

export default function LoginPage() {
  const isAuthenticated = useIsAuthenticated();
  const isBootstrapped = useAuth((s) => s.isBootstrapped);

  // Avoid flashing the login form while the bootstrap refresh is in flight
  if (!isBootstrapped) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to catch the next drop.">
      <LoginForm />
      <GoogleSignInButton />
    </AuthLayout>
  );
}
