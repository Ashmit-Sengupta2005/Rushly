import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, extractApiError } from '@/lib/apiClient';
import { queryKeys } from '@/config/queryClient';
import { useIsAuthenticated } from '@/features/auth/useAuth';
import type { RestockAlertsResponse } from '@/types/api';

/** "Notify me when it's back" for one product. The email goes out when an admin restocks it. */
export function useRestockAlert(productId: string) {
  const qc = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  const { data: productIds } = useQuery({
    queryKey: queryKeys.restockAlerts.me,
    queryFn: async () => (await apiClient.get<RestockAlertsResponse>('/restock-alerts')).productIds,
    enabled: isAuthenticated,
  });
  const subscribed = !!productIds?.includes(productId);

  const mutation = useMutation({
    mutationFn: (subscribe: boolean) =>
      subscribe
        ? apiClient.put<void>(`/restock-alerts/${productId}`)
        : apiClient.delete<void>(`/restock-alerts/${productId}`),
    onSuccess: (_data, subscribe) => {
      qc.setQueryData<string[]>(queryKeys.restockAlerts.me, (old = []) =>
        subscribe ? [...old, productId] : old.filter((id) => id !== productId),
      );
      toast.success(subscribe ? "We'll email you when it's back" : 'Alert removed');
    },
    onError: (err) => toast.error(extractApiError(err).message),
  });

  return { subscribed, toggle: () => mutation.mutate(!subscribed), isPending: mutation.isPending };
}
