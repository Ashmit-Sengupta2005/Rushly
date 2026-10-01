import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, extractApiError } from '@/lib/apiClient';
import { queryKeys } from '@/config/queryClient';
import type { CreateReservationResponse, ShippingAddressInput } from '@/types/api';

export function useCreateReservation() {
  const qc = useQueryClient();

  return useMutation({
    // Items come from the server-side cart; the body is only the address.
    // NOTE: the response id field is `reservationId` (not `id`).
    mutationFn: async (shippingAddress: ShippingAddressInput) =>
      (await apiClient.post<CreateReservationResponse>('/checkout/reserve', { shippingAddress }))
        .reservation,
    onSuccess: () => {
      // The backend CLEARS the cart on a successful reserve
      return qc.invalidateQueries({ queryKey: queryKeys.cart.me });
    },
    onError: (err) => {
      // e.g. EMPTY_CART, INSUFFICIENT_STOCK, or a field message like "Phone must be 10–15 digits"
      toast.error(extractApiError(err).message);
    },
  });
}
