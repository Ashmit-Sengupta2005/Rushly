import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { apiClient, extractApiError } from '@/lib/apiClient';
import { tokenStorage } from '@/lib/tokenStorage';
import { queryClient } from '@/config/queryClient';
import { useAuth } from './useAuth';
import type { LoginInput, LoginResponse } from '@/types/api';

export type { LoginInput };

export function useLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  return useMutation({
    // apiClient.post already unwraps the axios response → returns the body.
    // Its interceptor also renames the backend's `tokens` → `accessToken`.
    mutationFn: (input: LoginInput) => apiClient.post<LoginResponse>('/auth/login', input),
    onSuccess: (data) => {
      // Drop anything cached for a previous user (e.g. their cart) before switching.
      queryClient.clear();
      tokenStorage.set(data.accessToken);
      useAuth.getState().setUser(data.user);
      toast.success(`Welcome back, ${data.user.name}`);
      // Return to the page ProtectedRoute bounced us from (e.g. /checkout), else home.
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from ?? '/', { replace: true });
    },
    onError: (err) => {
      toast.error(extractApiError(err).message);
    },
  });
}
