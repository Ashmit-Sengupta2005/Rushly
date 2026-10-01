import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/config/queryClient';
import type { GetReservationResponse } from '@/types/api';

// ⚠️ Every /checkout/* call (reserve, pay, AND each poll) shares one
// 30-requests/min-per-user rate limit. 3 s polling = 20/min, leaving headroom
// for reserve + pay. Don't go faster.
const POLL_MS = 3000;

export function useReservation(
  reservationId: string | undefined,
  { poll = false }: { poll?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.reservations.detail(reservationId ?? ''),
    // apiClient.get already unwraps the axios response → body is { reservation }
    queryFn: async () =>
      (await apiClient.get<GetReservationResponse>(`/checkout/reservations/${reservationId}`))
        .reservation,
    enabled: !!reservationId,
    // Poll only while waiting for the Stripe webhook to flip PENDING → PAID.
    // The caller turns `poll` off after a timeout so it can't run forever.
    refetchInterval: (query) =>
      poll && query.state.data?.status === 'PENDING' ? POLL_MS : false,
    // A 404 (not yours / doesn't exist) won't fix itself — don't retry it
    retry: (count, err) =>
      count < 1 && (err as { response?: { status?: number } }).response?.status !== 404,
  });
}
