import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/config/queryClient';
import type { OrderDetailResponse } from '@/types/api';

// No polling: orders are created already PAID by the Stripe webhook, and later
// changes (refunds) are rare admin actions — a normal refetch is enough.
export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId ?? ''),
    // apiClient.get already unwraps the axios response → body is { order }
    queryFn: async () => (await apiClient.get<OrderDetailResponse>(`/orders/${orderId}`)).order,
    enabled: !!orderId,
    // Not yours / doesn't exist → 404 that won't fix itself; don't retry it
    retry: (count, err) =>
      count < 1 && (err as { response?: { status?: number } }).response?.status !== 404,
  });
}
