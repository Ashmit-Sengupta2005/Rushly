import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { apiClient } from '@/lib/apiClient';
import { tokenStorage } from '@/lib/tokenStorage';
import { useAuth } from './useAuth';
import { queryClient } from '@/config/queryClient';

export function useLogout() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      // Await so the server clears the refresh cookie and bumps the token version
      // before we redirect. If the call fails, we still clear local state below —
      // being logged out locally wins.
      try {
        await apiClient.post('/auth/logout');
      } catch {
        // ignore — the user wants out either way
      }
    },
    onSettled: () => {
      tokenStorage.clear();
      useAuth.getState().clear();
      // Navigate first so private pages (cart, orders) unmount, then drop their
      // cache. Clearing first could make still-mounted queries refetch without a
      // token → 401 → a wasted /auth/refresh call against the 5/min limit.
      navigate('/login', { replace: true });
      queryClient.clear();
      toast.success('Logged out');
    },
  });
}
