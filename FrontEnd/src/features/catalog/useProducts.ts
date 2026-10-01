import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/config/queryClient';
import type { ProductsListResponse } from '@/types/api';

const PAGE_SIZE = 20;

export function useProducts() {
  return useInfiniteQuery({
    queryKey: queryKeys.products.list(),
    // apiClient.get already unwraps the axios response → returns the body
    queryFn: ({ pageParam }) =>
      apiClient.get<ProductsListResponse>('/products', {
        params: { limit: PAGE_SIZE, ...(pageParam && { cursor: pageParam }) },
      }),
    initialPageParam: null as string | null,
    // Backend sends nextCursor: null on the last page → hasNextPage becomes false
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
