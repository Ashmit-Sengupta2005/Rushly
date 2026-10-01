import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { apiClient, extractApiError } from '@/lib/apiClient';
import { tokenStorage } from '@/lib/tokenStorage';
import { queryClient } from '@/config/queryClient';
import { useAuth } from './useAuth';
import type { RegisterInput, RegisterResponse } from '@/types/api';

export type { RegisterInput };

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    // apiClient.post already unwraps the axios response → returns the body.
    // Its interceptor also renames the backend's `tokens` → `accessToken`.
    mutationFn: (input: RegisterInput) =>
      apiClient.post<RegisterResponse>('/auth/register', input),
    onSuccess: (data) => {
      // Drop anything cached for a previous user before switching.
      queryClient.clear();
      tokenStorage.set(data.accessToken);
      useAuth.getState().setUser(data.user);
      toast.success(`Account created. Welcome, ${data.user.name}`);
      navigate('/', { replace: true });
    },
    onError: (err) => {
      // e.g. EMAIL_TAKEN, or a field message like "Password is too common"
      toast.error(extractApiError(err).message);
    },
  });
}
