import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, extractApiError } from '@/lib/apiClient';
import { queryKeys } from '@/config/queryClient';
import type { CancelReservationResponse } from '@/types/api';

// Releases the held stock immediately instead of waiting for the 10-min expiry.
// Idempotent: cancelling an already-resolved reservation just returns its status.
export function useCancelReservation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (reservationId: string) =>
      apiClient.delete<CancelReservationResponse>(`/checkout/reservations/${reservationId}`),
    onSuccess: (_data, reservationId) =>
      qc.invalidateQueries({ queryKey: queryKeys.reservations.detail(reservationId) }),
    onError: (err) => {
      toast.error(extractApiError(err).message);
    },
  });
}
