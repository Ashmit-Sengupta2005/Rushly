import { QueryClient } from '@tanstack/react-query';

/**
 * One QueryClient for the whole app.
 *
 * Defaults chosen for Rushly:
 * - staleTime: 30s — products/cart feel fresh without hammering the API
 * - retry: 1 — one quick retry for transient blips (ECONNRESET etc.)
 *   NOT more, because 401s should not be retried blindly — apiClient's
 *   interceptor already handles refresh. A `retry: 3` here would amplify
 *   auth storms when the user's refresh token is revoked.
 * - refetchOnWindowFocus: false — avoids surprise refetches on tab switches
 *   mid-checkout. Can enable per-query where helpful.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Mutations never retry — a failed add-to-cart or reserve must surface
      // immediately so the user sees the error. Silent retries hide bugs.
      retry: false,
    },
  },
});

// ============================================================
// Query keys — one place to define them, so invalidation can't typo.
// Use these everywhere; never a hand-written array like ['cart'].
// ============================================================
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  products: {
    all: ['products'] as const,
    list: (filters?: object) => ['products', 'list', filters ?? {}] as const,
    detail: (slug: string) => ['products', 'detail', slug] as const,
  },
  cart: {
    me: ['cart', 'me'] as const,
  },
  reservations: {
    detail: (id: string) => ['reservations', id] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: ['orders', 'list'] as const,
    detail: (id: string) => ['orders', id] as const,
  },
} as const;