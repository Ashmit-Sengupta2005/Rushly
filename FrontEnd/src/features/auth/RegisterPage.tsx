import { Navigate } from 'react-router';
import { RegisterForm } from '@/features/auth/RegisterForm';
import { useAuth, useIsAuthenticated } from '@/features/auth/useAuth';

export default function RegisterPage() {
  const isAuthenticated = useIsAuthenticated();
  const isBootstrapped = useAuth((s) => s.isBootstrapped);

  if (!isBootstrapped) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">
            Start shopping on Rushly in seconds
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}