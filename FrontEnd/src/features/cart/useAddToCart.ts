import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, extractApiError } from '@/lib/apiClient';
import { queryClient, queryKeys } from '@/config/queryClient';
import type { AddCartItemInput, CartItemMutationResponse } from '@/types/api';
import { useCartDrawer } from './useCartDrawer';

export function useAddToCart() {
  const openDrawer = useCartDrawer((s) => s.setOpen);
  return useMutation({
    // Backend returns { item }, not the whole cart — the cart query is refetched below
    mutationFn: (input: AddCartItemInput) =>
      apiClient.post<CartItemMutationResponse>('/cart/items', input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart.me });
      // The opening drawer is the confirmation — no toast needed
      openDrawer(true);
    },
    onError: (err) => {
      toast.error(extractApiError(err).message);
    },
  });
}
