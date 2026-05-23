import { apiConfig } from './config';
import {
  ApiError,
  ApiAuthError,
  ApiNetworkError,
  ApiCancelledError,
  formatApiDetail,
} from './errors';
import { ensureFreshTokens, refreshAfter401 } from './refresh';
import { loadTokens } from '@/lib/storage/tokens';

// Ported from swisdesk/frontend/trader/src/lib/api/client.ts with mobile
// adaptations:
//   • Bearer-only auth (no cookies; React Native fetch can't manage them
//     reliably across iOS/Android anyway).
//   • Proactive refresh — if the access token is < 60s from expiry we
//     refresh BEFORE the request rather than waiting for a 401.
//   • Reactive refresh — a true 401 falls back through the refresh path
//     once, then retries the original request a single time.
//   • 429 retry honours Retry-After like the web client, but only for GET.

export interface RequestOptions {
  signal?: AbortSignal;
  /** Override the default timeout for this single call. */
  timeoutMs?: number;
  /** Skip the Bearer-token attachment (used by the auth endpoints themselves). */
  anonymous?: boolean;
  /** Search-string params, appended via URLSearchParams. Values are stringified. */
  params?: Record<string, string | number | boolean | null | undefined>;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

class ApiClient {
  private buildUrl(path: string, params?: RequestOptions['params']): string {
    const url = new URL(`${apiConfig.apiBase}${path.startsWith('/') ? path : `/${path}`}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null || v === '') continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private async request<T>(
    method: Method,
    path: string,
    body: unknown,
    opts: RequestOptions = {},
    retry429 = 0,
    retried401 = false,
  ): Promise<T> {
    const url = this.buildUrl(path, opts.params);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (!opts.anonymous) {
      // Proactive refresh — cheap when not needed (just a SecureStore read).
      const fresh = await ensureFreshTokens(false).catch(() => null);
      const tokens = fresh ?? (await loadTokens());
      if (tokens) headers['Authorization'] = `Bearer ${tokens.access}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      opts.timeoutMs ?? apiConfig.requestTimeoutMs,
    );

    // Bridge caller's signal to our controller so the caller can cancel
    // and we still clean up the timeout.
    let externalAbort = false;
    const onCallerAbort = () => {
      externalAbort = true;
      clearTimeout(timer);
      controller.abort();
    };
    if (opts.signal) {
      if (opts.signal.aborted) {
        clearTimeout(timer);
        throw new ApiCancelledError();
      }
      opts.signal.addEventListener('abort', onCallerAbort);
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body == null ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e: unknown) {
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onCallerAbort);
      if (externalAbort) throw new ApiCancelledError();
      const aborted = e instanceof Error && e.name === 'AbortError';
      throw new ApiNetworkError(
        aborted
          ? 'Request timed out — check your connection or restart the gateway.'
          : 'Could not reach the gateway. Make sure docker compose is running and EXPO_PUBLIC_API_BASE points at it.',
        path,
        e,
      );
    }
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onCallerAbort);

    // 429 — retry GETs with exponential backoff honouring Retry-After. Never
    // retry mutations: a 429 on a POST /orders means rate-limited, and a
    // silent retry could double-fill an order.
    if (res.status === 429 && method === 'GET' && retry429 < apiConfig.max429Retries) {
      const retryAfter = parseFloat(res.headers.get('Retry-After') || '');
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(5_000, retryAfter * 1_000)
        : Math.min(4_000, 400 * Math.pow(2, retry429));
      await new Promise((r) => setTimeout(r, delay));
      return this.request<T>(method, path, body, opts, retry429 + 1, retried401);
    }

    // 401 — try a refresh ONCE then retry. If refresh fails the caller gets
    // ApiAuthError and should boot to login.
    if (res.status === 401 && !opts.anonymous && !retried401) {
      try {
        await refreshAfter401(path);
        return this.request<T>(method, path, body, opts, retry429, true);
      } catch (e) {
        if (e instanceof ApiAuthError) throw e;
        throw new ApiAuthError('Session expired — please sign in again.', path);
      }
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const detail = (errBody as { detail?: unknown }).detail;
      const msg = formatApiDetail(detail, `HTTP ${res.status}`);
      if (res.status === 401) throw new ApiAuthError(msg, path, detail);
      throw new ApiError(msg, res.status, path, detail);
    }

    // Empty 204s are common (mark-read etc). Don't blow up trying to JSON-parse.
    const text = await res.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }

  get<T>(path: string, params?: RequestOptions['params'], opts?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, { ...(opts ?? {}), params });
  }

  post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, opts ?? {});
  }

  put<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, body, opts ?? {});
  }

  patch<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, body, opts ?? {});
  }

  delete<T>(path: string, opts?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, opts ?? {});
  }
}

export const api = new ApiClient();
export default api;
