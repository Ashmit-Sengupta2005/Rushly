import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, extractApiError } from '@/lib/apiClient';
import { queryKeys } from '@/config/queryClient';
import type { AdminOverview, RevenueResponse } from '@/types/api';

export function useAdminOverview(days: number) {
  return useQuery({
    queryKey: queryKeys.admin.overview(days),
    queryFn: () => apiClient.get<AdminOverview>('/admin/metrics/overview', { params: { days } }),
    refetchInterval: 30_000,
  });
}

export function useAdminRevenue(days: number) {
  return useQuery({
    queryKey: queryKeys.admin.revenue(days),
    queryFn: () => apiClient.get<RevenueResponse>('/admin/metrics/revenue', { params: { days } }),
    refetchInterval: 60_000,
  });
}

/** Full refund (amount omitted). Stripe confirms asynchronously via webhook. */
export function useRefundOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      apiClient.post(`/admin/orders/${orderId}/refund`, { reason: 'requested_by_customer' }),
    onSuccess: () => {
      toast.success('Refund started — it completes when Stripe confirms');
      return qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err) => toast.error(extractApiError(err).message),
  });
}
