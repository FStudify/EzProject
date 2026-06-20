/**
 * ============================================================
 * API Config — Centralized Fetch Wrapper
 * ============================================================
 *
 * Mọi request HTTP đi qua đây. Không có fetch() gọi trực tiếp
 * ngoài api/ folder.
 *
 * Features:
 * - Auto inject JWT Bearer token
 * - Timeout handling (10s default)
 * - Auto JSON parsing
 * - Global error normalization
 * - Token refresh on 401
 * - Retry logic cho transient errors
 */

import { ApiError, NetworkError, UnauthorizedError } from './errors';

// ── Storage Keys ─────────────────────────────────────────────
const ACCESS_TOKEN_KEY = 'ez_access_token';
const REFRESH_TOKEN_KEY = 'ez_refresh_token';

// ── Token Management ──────────────────────────────────────────
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ── Config ───────────────────────────────────────────────────
interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

function normalizeApiBaseUrl(rawUrl: string): string {
  return rawUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
}

const config: ApiConfig = {
  baseUrl: normalizeApiBaseUrl(import.meta.env.VITE_API_URL || 'http://localhost:3000'),
  timeout: 10_000, // 10 seconds
  retryAttempts: 1,
  retryDelay: 1_000, // 1 second
};

function shouldAttemptRefresh(path: string): boolean {
  return ![
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/refresh',
  ].includes(path);
}

// ── HTTP Methods ─────────────────────────────────────────────

async function request<T = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: RequestInit & { timeout?: number } = {},
): Promise<T> {
  const url = `${config.baseUrl}${path}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.retryAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        method,
        ...options,
        headers: buildHeaders(options.headers, undefined, options.body),
      });

      // 401 → try refresh token
      if (response.status === 401 && shouldAttemptRefresh(path)) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          // Retry with new token
          const retryResponse = await fetchWithTimeout(url, {
            method,
            ...options,
            headers: buildHeaders(options.headers, refreshed, options.body),
          });
          return handleResponse(retryResponse);
        } else {
          clearTokens();
          window.dispatchEvent(new CustomEvent('auth:logout'));
          throw new UnauthorizedError('Session expired. Please login again.');
        }
      }

      return handleResponse(response);
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      if (err instanceof ApiError) throw err;

      lastError = err as Error;

      if (attempt < config.retryAttempts) {
        await sleep(config.retryDelay * (attempt + 1));
      }
    }
  }

  throw lastError || new NetworkError('Request failed after retries');
}

function buildHeaders(
  customHeaders: HeadersInit | undefined,
  accessToken?: string | null,
  body?: BodyInit | null,
): HeadersInit {
  const token = accessToken ?? getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(customHeaders as Record<string, string>),
  };

  // Không set Content-Type cho FormData — browser tự set boundary
  if (body instanceof FormData) {
    delete headers['Content-Type'];
  }

  return headers;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number },
): Promise<Response> {
  const { timeout = config.timeout, ...fetchOptions } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function handleResponse<T>(response: Response): Promise<T> {
  return new Promise((resolve, reject) => {
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (response.status === 204) {
      resolve({} as T);
      return;
    }

    if (isJson) {
      response.json().then(
        (body) => {
          if (response.ok) {
            // unwrap { success: true, data: ... } or raw data
            if (body && typeof body === 'object' && 'success' in body && body.success) {
              resolve(body.data as T);
            } else {
              resolve(body as T);
            }
          } else {
            reject(normalizeError(response.status, body));
          }
        },
        () => reject(new ApiError(response.status, 'Invalid JSON response')),
      );
    } else {
      if (response.ok) {
        response.text().then(resolve as unknown as (value: unknown) => void, reject);
      } else {
        response.text().then(
          (text) => reject(new ApiError(response.status, text || response.statusText)),
          () => reject(new ApiError(response.status, response.statusText)),
        );
      }
    }
  });
}

function normalizeError(status: number, body: unknown): ApiError {
  const raw = body as Record<string, unknown> | null;
  const msg =
    raw && 'error' in raw
      ? typeof raw.error === 'string'
        ? raw.error
        : typeof raw.error === 'object' && raw.error !== null && 'message' in raw.error
          ? String((raw.error as Record<string, unknown>).message)
          : JSON.stringify(body)
      : typeof body === 'string'
        ? body
        : raw && 'message' in raw
          ? String(raw.message)
          : `HTTP ${status}`;

  return new ApiError(status, msg);
}

// ── Token Refresh ─────────────────────────────────────────────

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshSubscribers.push(resolve);
    });
  }

  isRefreshing = true;

  try {
    const response = await fetch(`${config.baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.json() as { data: { accessToken: string } };
    const { accessToken } = body.data;
    const newRefreshToken =
      (body as { data: { refreshToken?: string } }).data?.refreshToken || refreshToken;

    setTokens(accessToken, newRefreshToken);

    refreshSubscribers.forEach((cb) => cb(accessToken));
    refreshSubscribers = [];

    return accessToken;
  } catch {
    return null;
  } finally {
    isRefreshing = false;
  }
}

// ── Exported HTTP Helpers ──────────────────────────────────────

export const api = {
  get<T = unknown>(path: string, options?: RequestInit): Promise<T> {
    return request<T>('GET', path, options);
  },

  post<T = unknown>(path: string, body?: unknown, options?: RequestInit & { timeout?: number }): Promise<T> {
    const { timeout, ...rest } = options || {};
    return request<T>('POST', path, {
      ...rest,
      ...(timeout ? { timeout } : {}),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  put<T = unknown>(path: string, body?: unknown, options?: RequestInit & { timeout?: number }): Promise<T> {
    const { timeout, ...rest } = options || {};
    return request<T>('PUT', path, {
      ...rest,
      ...(timeout ? { timeout } : {}),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  patch<T = unknown>(path: string, body?: unknown, options?: RequestInit & { timeout?: number }): Promise<T> {
    const { timeout, ...rest } = options || {};
    return request<T>('PATCH', path, {
      ...rest,
      ...(timeout ? { timeout } : {}),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T = unknown>(path: string, options?: RequestInit & { timeout?: number }): Promise<T> {
    const { timeout, ...rest } = options || {};
    return request<T>('DELETE', path, {
      ...rest,
      ...(timeout ? { timeout } : {}),
    });
  },

  /**
   * Upload file via FormData — không auto JSON stringify
   */
  upload<T = unknown>(
    path: string,
    formData: FormData,
    options?: RequestInit & { timeout?: number },
  ): Promise<T> {
    const { timeout, ...rest } = options || {};
    return request<T>('POST', path, {
      ...rest,
      ...(timeout ? { timeout } : {}),
      body: formData,
      headers: { Accept: 'application/json' },
    });
  },

  /** Lấy config (để test hoặc override) */
  getConfig(): ApiConfig {
    return { ...config };
  },
};

// ── Utilities ─────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Re-export types & errors ──────────────────────────────────
export type { ApiResponse, PaginatedResponse } from './types';
export { ApiError, NetworkError, UnauthorizedError, ValidationError } from './errors';
