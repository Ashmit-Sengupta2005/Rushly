import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/config/queryClient';
import type { CartResponse } from '@/types/api';

export function useCart() {
  return useQuery({
    queryKey: queryKeys.cart.me,
    queryFn: async () => {
      const res = await apiClient.get<CartResponse>('/cart');
      return res.cart;
    },
  });
}
