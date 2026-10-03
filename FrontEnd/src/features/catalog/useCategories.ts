import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/config/queryClient';
import type { CategoriesResponse } from '@/types/api';

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async () => (await apiClient.get<CategoriesResponse>('/categories')).categories,
    // Categories almost never change
    staleTime: 10 * 60_000,
  });
}
