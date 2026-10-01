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
      queryClient.clear(); // nuke any cached private data
      toast.success('Logged out');
      // replace: Back button shouldn't return to a private page after logout
      navigate('/login', { replace: true });
    },
  });
}
