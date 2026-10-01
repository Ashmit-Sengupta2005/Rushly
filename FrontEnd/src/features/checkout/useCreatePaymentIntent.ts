import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { CreatePaymentIntentInput, CreatePaymentIntentResponse } from '@/types/api';

// POST /checkout/pay { reservationId } → { paymentIntentId, clientSecret, amount }.
// Idempotent on the backend: calling it again for the same PENDING reservation
// returns the existing intent, so a page refresh doesn't create orphan intents.
// The amount is computed server-side — never send it from the client.
// (No toast here: PaymentPage shows the error inline with a retry button.)
export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: (reservationId: string) =>
      apiClient.post<CreatePaymentIntentResponse>('/checkout/pay', {
        reservationId,
      } satisfies CreatePaymentIntentInput),
  });
}
