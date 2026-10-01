import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/config/queryClient';
import type { OrdersListResponse } from '@/types/api';

const PAGE_SIZE = 20;

// Same cursor-pagination pattern as features/catalog/useProducts.ts.
// List items include `items` but not statusHistory/refunds (detail only).
export function useOrders() {
  return useInfiniteQuery({
    queryKey: queryKeys.orders.list,
    // apiClient.get already unwraps the axios response → returns the body
    queryFn: ({ pageParam }) =>
      apiClient.get<OrdersListResponse>('/orders', {
        params: { limit: PAGE_SIZE, ...(pageParam && { cursor: pageParam }) },
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
