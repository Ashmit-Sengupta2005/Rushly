import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, extractApiError } from '@/lib/apiClient';
import { queryKeys } from '@/config/queryClient';
import type { CartItemMutationResponse, CartResponse } from '@/types/api';
import { useIsAuthenticated } from '@/features/auth/useAuth';

// Add-to-cart lives in ./useAddToCart.ts (used by the product page).

export function useCart() {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: queryKeys.cart.me,
    // apiClient.get already unwraps the axios response → body is { cart }
    queryFn: async () => (await apiClient.get<CartResponse>('/cart')).cart,
    // /cart requires auth — don't fire (and burn a refresh) when logged out
    enabled: isAuthenticated,
  });
}

/*
 * Why invalidate instead of setQueryData:
 * PATCH returns only `{ item }` and DELETE returns 204 with no body — neither
 * is a Cart. Writing them into the cart cache would corrupt it (DELETE would
 * wipe it to undefined). Refetching also brings back the server-computed
 * fields (lineTotal, subtotal, priceChanged, outOfStock).
 */

export function useUpdateCartItem() {
  const qc = useQueryClient();

  return useMutation({
    // Backend route is keyed by PRODUCT id, and the body field is `quantity`
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      apiClient.patch<CartItemMutationResponse>(`/cart/items/${productId}`, { quantity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cart.me }),
    onError: (err) => {
      toast.error(extractApiError(err).message);
    },
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => apiClient.delete<void>(`/cart/items/${productId}`),
    onSuccess: () => {
      toast.success('Removed from cart');
      return qc.invalidateQueries({ queryKey: queryKeys.cart.me });
    },
    onError: (err) => {
      toast.error(extractApiError(err).message);
    },
  });
}
