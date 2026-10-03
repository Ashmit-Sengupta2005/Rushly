import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '@/config/env';
import { tokenStorage } from './tokenStorage';
import type { ApiErrorPayload, RefreshResponse } from '@/types/api';

// ============================================================
// Base axios instance
// ============================================================
// withCredentials: true — refresh token lives in httpOnly cookie, backend
// requires credentials for CORS. Without this the cookie is NOT sent and
// /auth/refresh will 401 every time.
export const api = axios.create({
  baseURL: env.API_BASE, // ${VITE_API_URL}/api
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ============================================================
// Request interceptor — attach access token
// ============================================================
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// ============================================================
// Response interceptor — single-flight 401 refresh
// ============================================================
// Why single-flight:
//   The backend's /auth/refresh is rate-limited to 5 req/min per IP.
//   If 10 queries fire at once and the token is expired, naive handling
//   would call /refresh 10 times → 5 succeed, 5 get rate-limited.
//   Instead, the FIRST 401 triggers one refresh; all other 401s during
//   that window wait on the same promise and reuse the resulting token.
//
// Why we NEVER retry /auth/refresh itself:
//   If refresh fails, infinite loop risk is real. We must clear tokens
//   and let the UI redirect to login.
//
// How a config knows it has already been retried:
//   We tag it with `_retry = true` on the first retry. Second time around,
//   we don't try again — just propagate the error.

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// The in-progress refresh promise. If null, no refresh is happening.
// If non-null, every incoming 401 awaits this instead of starting its own.
let refreshPromise: Promise<RefreshResponse> | null = null;

/**
 * Perform the actual refresh. One at a time, process-wide.
 * On success, writes the new token to the store and returns the full
 * response ({ user, accessToken }) so the auth bootstrap can reuse it.
 * On failure, clears tokens and rejects.
 */
async function doRefresh(): Promise<RefreshResponse> {
  try {
    // Use raw axios (not `api`) to bypass interceptors — we don't want
    // to recurse into this same interceptor on the refresh request itself.
    const response = await axios.post<RefreshResponse>(
      `${env.API_BASE}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    tokenStorage.set(response.data.accessToken); // ← refresh uses `accessToken` key
    return response.data;
  } catch (err) {
    // Refresh failed → user is effectively logged out. Clear the store so
    // UI reacts (route guards redirect to /login).
    tokenStorage.clear();
    throw err;
  }
}

/**
 * Public helper: get a refresh promise, creating one if none exists.
 * All concurrent callers share the same promise — exactly one network call.
 */
export function refreshAccessToken(): Promise<RefreshResponse> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      // Clear the slot once settled so the NEXT 401 can start a new refresh.
      // finally() runs for both success and failure.
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  // Normalize login/register/google responses: they return `tokens` instead of `accessToken`.
  // Rewrite them in-place so the rest of the code only ever sees `accessToken`.
  (response: AxiosResponse) => {
    const url = response.config.url ?? '';
    const isLoginOrRegister =
      url.endsWith('/auth/login') ||
      url.endsWith('/auth/register') ||
      url.endsWith('/auth/google');
    if (isLoginOrRegister && response.data && typeof response.data === 'object') {
      const data = response.data as { tokens?: string; accessToken?: string };
      if (data.tokens && !data.accessToken) {
        data.accessToken = data.tokens;
        delete data.tokens;
      }
    }
    return response;
  },
  async (error: AxiosError<ApiErrorPayload>) => {
    const originalRequest = error.config as RetryableRequest | undefined;
    const status = error.response?.status;
    const url = originalRequest?.url ?? '';

    // Non-401 or no config → propagate as-is.
    if (status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Never try to refresh if the failing request IS /auth/refresh itself —
    // that would recurse. Also skip /auth/login and /auth/google (bad
    // credentials shouldn't trigger refresh).
    if (
      url.endsWith('/auth/refresh') ||
      url.endsWith('/auth/login') ||
      url.endsWith('/auth/google')
    ) {
      return Promise.reject(error);
    }

    // Already retried once → give up, let caller handle it.
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Join (or start) the single in-flight refresh.
      const { accessToken: newToken } = await refreshAccessToken();
      // Replay the original request with the new token.
      originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
      return api.request(originalRequest);
    } catch (refreshError) {
      // Refresh failed → the retry fails too. UI will see the original 401
      // (or whatever refresh threw) and redirect to login.
      return Promise.reject(refreshError);
    }
  },
);

// ============================================================
// Error extraction helper — use when displaying errors to users
// ============================================================
export function extractApiError(err: unknown): {
  code: string;
  message: string;
  status?: number;
} {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorPayload | undefined;
    if (data?.error) {
      return {
        code: data.error.code,
        // Validation errors carry a generic message; the useful text is in
        // details: { field: ["msg", ...] }. Surface the first field message.
        // `||` not `??`: also guards against an empty-string message
        message:
          firstFieldError(data.error.details) ||
          data.error.message ||
          'Something went wrong. Please try again.',
        status: err.response?.status,
      };
    }
    // No response at all → backend down / CORS / offline
    if (!err.response) {
      return { code: 'NETWORK_ERROR', message: "Can't reach the server. Please try again." };
    }
    return {
      code: err.code ?? 'HTTP_ERROR',
      message: err.message,
      status: err.response.status,
    };
  }
  if (err instanceof Error) {
    return { code: 'UNKNOWN', message: err.message };
  }
  return { code: 'UNKNOWN', message: 'An unknown error occurred' };
}

function firstFieldError(details: unknown): string | undefined {
  if (!details || typeof details !== 'object') return undefined;
  for (const messages of Object.values(details)) {
    if (Array.isArray(messages) && typeof messages[0] === 'string') return messages[0];
  }
  return undefined;
}

// ============================================================
// Convenience wrapper for typed GET/POST/etc.
// Not strictly necessary — components can use `api` directly —
// but these give you one import and no AxiosResponse unwrapping.
// ============================================================
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    api.get<T>(url, config).then((r) => r.data),

  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    api.post<T>(url, body, config).then((r) => r.data),

  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    api.patch<T>(url, body, config).then((r) => r.data),

  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    api.put<T>(url, body, config).then((r) => r.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    api.delete<T>(url, config).then((r) => r.data),
};