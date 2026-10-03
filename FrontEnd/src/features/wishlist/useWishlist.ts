import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, extractApiError } from '@/lib/apiClient';
import { queryKeys } from '@/config/queryClient';
import { useIsAuthenticated } from '@/features/auth/useAuth';
import type { ProductListItem, WishlistResponse } from '@/types/api';

export function useWishlist() {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: queryKeys.wishlist.me,
    queryFn: async () => (await apiClient.get<WishlistResponse>('/wishlist')).items,
    enabled: isAuthenticated,
  });
}

/** Saved state for one product + a toggle. Optimistic so the heart reacts instantly. */
export function useWishlistToggle(product: ProductListItem) {
  const qc = useQueryClient();
  const { data: items } = useWishlist();
  const saved = !!items?.some((p) => p.id === product.id);

  const mutation = useMutation({
    mutationFn: (save: boolean) =>
      save
        ? apiClient.put<void>(`/wishlist/${product.id}`)
        : apiClient.delete<void>(`/wishlist/${product.id}`),
    onMutate: async (save) => {
      await qc.cancelQueries({ queryKey: queryKeys.wishlist.me });
      const previous = qc.getQueryData<ProductListItem[]>(queryKeys.wishlist.me);
      qc.setQueryData<ProductListItem[]>(queryKeys.wishlist.me, (old = []) =>
        save ? [product, ...old.filter((p) => p.id !== product.id)] : old.filter((p) => p.id !== product.id),
      );
      return { previous };
    },
    onError: (err, _save, context) => {
      qc.setQueryData(queryKeys.wishlist.me, context?.previous);
      toast.error(extractApiError(err).message);
    },
    onSuccess: (_data, save) => {
      if (save) toast.success('Saved to your wishlist');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.wishlist.me }),
  });

  return { saved, toggle: () => mutation.mutate(!saved), isPending: mutation.isPending };
}
