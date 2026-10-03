import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/config/queryClient';
import type { ListProductsQuery, ProductsListResponse } from '@/types/api';

const PAGE_SIZE = 20;

export type ProductFilters = Pick<ListProductsQuery, 'search' | 'categorySlug'>;

export function useProducts(filters: ProductFilters = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.products.list(filters),
    // apiClient.get already unwraps the axios response → returns the body
    queryFn: ({ pageParam }) =>
      apiClient.get<ProductsListResponse>('/products', {
        params: {
          limit: PAGE_SIZE,
          ...(filters.search && { search: filters.search }),
          ...(filters.categorySlug && { categorySlug: filters.categorySlug }),
          ...(pageParam && { cursor: pageParam }),
        },
      }),
    initialPageParam: null as string | null,
    // Backend sends nextCursor: null on the last page → hasNextPage becomes false
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // Keep showing the old results while a new search/filter loads — no skeleton flash per keystroke
    placeholderData: keepPreviousData,
  });
}
