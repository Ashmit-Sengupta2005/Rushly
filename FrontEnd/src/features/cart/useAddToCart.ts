import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, extractApiError } from '@/lib/apiClient';
import { queryClient, queryKeys } from '@/config/queryClient';
import type { AddCartItemInput, CartItemMutationResponse } from '@/types/api';

export function useAddToCart() {
  return useMutation({
    // Backend returns { item }, not the whole cart — the cart query is refetched below
    mutationFn: (input: AddCartItemInput) =>
      apiClient.post<CartItemMutationResponse>('/cart/items', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.me });
      toast.success('Added to cart');
    },
    onError: (err) => {
      toast.error(extractApiError(err).message);
    },
  });
}
