import { Navigate } from 'react-router';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { RegisterForm } from '@/features/auth/RegisterForm';
import { GoogleSignInButton } from '@/features/auth/GoogleSignInButton';
import { useAuth, useIsAuthenticated } from '@/features/auth/useAuth';

export default function RegisterPage() {
  const isAuthenticated = useIsAuthenticated();
  const isBootstrapped = useAuth((s) => s.isBootstrapped);

  if (!isBootstrapped) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <AuthLayout title="Create an account" subtitle="Start shopping on Rushly in seconds.">
      <RegisterForm />
      <GoogleSignInButton text="signup_with" />
    </AuthLayout>
  );
}
