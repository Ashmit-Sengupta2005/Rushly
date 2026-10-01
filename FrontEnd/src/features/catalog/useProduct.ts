import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/config/queryClient';
import type { ProductDetailResponse } from '@/types/api';

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.products.detail(slug ?? ''),
    queryFn: async () => {
      const res = await apiClient.get<ProductDetailResponse>(`/products/${slug}`);
      return res.product;
    },
    enabled: !!slug,
  });
}
