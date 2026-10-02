import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { apiClient, extractApiError } from '@/lib/apiClient';
import { tokenStorage } from '@/lib/tokenStorage';
import { queryClient } from '@/config/queryClient';
import { useAuth } from './useAuth';
import type { LoginResponse } from '@/types/api';

export function useGoogleLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  return useMutation({
    // `credential` is the Google ID token; the backend verifies it and returns
    // the same shape as /auth/login (interceptor renames `tokens` → `accessToken`).
    mutationFn: (credential: string) =>
      apiClient.post<LoginResponse>('/auth/google', { credential }),
    onSuccess: (data) => {
      queryClient.clear();
      tokenStorage.set(data.accessToken);
      useAuth.getState().setUser(data.user);
      toast.success(`Welcome, ${data.user.name}`);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from ?? '/', { replace: true });
    },
    onError: (err) => {
      toast.error(extractApiError(err).message);
    },
  });
}
