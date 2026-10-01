import { create } from 'zustand';

/**
 * Access token lives in memory only — in a Zustand store so React components
 * can subscribe to login/logout changes, and non-React code (apiClient) can
 * read/write via getState()/setState().
 *
 * Why not localStorage:
 *   - XSS can read localStorage. If any script on the page is compromised,
 *     the attacker walks away with every logged-in user's token.
 *   - The refresh token (httpOnly cookie) can't be read by JS at all —
 *     that's our persistence. On page load, apiClient's bootstrap calls
 *     /auth/refresh which uses the cookie and returns a fresh access token.
 *
 * Trade-off: full page reload loses the in-memory token for ~200ms until
 * the bootstrap refresh completes. AuthProvider handles that gracefully.
 */

interface TokenState {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  clear: () => void;
}

export const useTokenStore = create<TokenState>((set) => ({
  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),
  clear: () => set({ accessToken: null }),
}));

// ============================================================
// Non-React access — for apiClient, which runs outside components
// ============================================================
export const tokenStorage = {
  get: (): string | null => useTokenStore.getState().accessToken,
  set: (token: string | null): void => useTokenStore.getState().setAccessToken(token),
  clear: (): void => useTokenStore.getState().clear(),
};