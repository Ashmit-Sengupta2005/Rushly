import { useEffect, type ReactNode } from 'react';
import { refreshAccessToken } from '@/lib/apiClient';
import { useTokenStore } from '@/lib/tokenStorage';
import { useAuth } from './useAuth';

// Module-level singleton — survives StrictMode's double-invoke of effects,
// so the bootstrap refresh fires exactly once per page load.
let bootstrapPromise: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  try {
    // Go through apiClient's shared single-flight refresh. If a query 401s and
    // triggers a refresh while this one is in flight, both join the SAME request
    // instead of spending two of the 5/min /auth/refresh rate-limit slots.
    // Refresh already returns the user, so no extra /auth/me round trip.
    // (On success the token is stored; on failure it is cleared — by apiClient.)
    const { user } = await refreshAccessToken();
    useAuth.getState().setUser(user);
  } catch {
    // No valid refresh cookie — stay logged out, silently
    useAuth.getState().setUser(null);
  } finally {
    useAuth.getState().setBootstrapped();
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!bootstrapPromise) {
      bootstrapPromise = bootstrap();
    }
  }, []);

  // Keep user and token in sync: when apiClient clears the token because a
  // refresh failed mid-session (cookie expired/revoked), drop the user too.
  // Otherwise the UI would still look logged in while every request 401s.
  useEffect(
    () =>
      useTokenStore.subscribe((state, prev) => {
        if (prev.accessToken !== null && state.accessToken === null) {
          useAuth.getState().clear();
        }
      }),
    [],
  );

  return <>{children}</>;
}
