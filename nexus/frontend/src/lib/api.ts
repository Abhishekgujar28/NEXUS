import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { ApiEnvelope } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface Tokens {
  accessToken: string | null;
  refreshToken: string | null;
}

const TOKEN_KEY = 'nexus.tokens.v1';

export function loadTokens(): Tokens {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return { accessToken: null, refreshToken: null };
    return JSON.parse(raw) as Tokens;
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

export function saveTokens(t: Tokens): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Central API client. Adds Bearer auth, auto-refreshes on 401, and unwraps
 * the { success, data } envelope so callers just work with the payload.
 */
export const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const { accessToken } = loadTokens();
  if (accessToken && cfg.headers) {
    cfg.headers.Authorization = `Bearer ${accessToken}`;
  }
  return cfg;
});

let refreshing: Promise<string | null> | null = null;

async function attemptRefresh(): Promise<string | null> {
  if (refreshing) return refreshing;
  const { refreshToken } = loadTokens();
  if (!refreshToken) return null;
  refreshing = axios
    .post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
      `${API_BASE}/api/v1/auth/refresh`,
      { refreshToken },
      { withCredentials: true }
    )
    .then((res) => {
      const next = res.data?.data;
      if (!next) return null;
      saveTokens({ accessToken: next.accessToken, refreshToken: next.refreshToken });
      return next.accessToken;
    })
    .catch(() => {
      clearTokens();
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    if (error.response?.status === 401 && !original?._retried && !original?.url?.includes('/auth/')) {
      original._retried = true;
      const next = await attemptRefresh();
      if (next && original.headers) {
        original.headers.Authorization = `Bearer ${next}`;
        return api.request(original);
      }
    }
    return Promise.reject(error);
  }
);

/** Unwrap `{ success, data }` and return the payload directly. */
export async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

/** Extract a human-readable message from an Axios error. */
export function apiErrorMessage(err: unknown): string {
  const ax = err as AxiosError<{ error?: { message?: string }; message?: string }>;
  return (
    ax.response?.data?.error?.message ||
    ax.response?.data?.message ||
    ax.message ||
    'Something went wrong. Please try again.'
  );
}
