import api from './client';
import { apiConfig } from './config';
import { ApiError, ApiNetworkError, formatApiDetail } from './errors';
import type { AuthTokenResponse, PlatformStatus } from '@/types/auth';

// Typed thin wrappers over the gateway's auth endpoints. Keeping the
// strings here means feature code doesn't litter URL paths, and a backend
// rename becomes a one-file edit instead of a grep across screens.

/**
 * Token-issuing auth POST.
 *
 * Production runs the gateway in cookie mode (JWT_INCLUDE_REFRESH_IN_JSON=
 * false): the access token comes back in JSON but the REFRESH token rides in
 * the `pt_refresh` Set-Cookie header instead of the JSON body. The mobile app
 * is Bearer-only, so we do a raw fetch here (the shared client hides response
 * headers) and lift pt_refresh out of Set-Cookie when the JSON field is empty.
 * React Native exposes Set-Cookie (unlike browsers). When the operator sets
 * the flag true, the JSON already carries the token and this is a no-op.
 */
async function authTokenPost(path: string, body: unknown): Promise<AuthTokenResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), apiConfig.requestTimeoutMs);
  let res: Response;
  try {
    res = await fetch(`${apiConfig.apiBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });
  } catch (e: unknown) {
    clearTimeout(timer);
    const aborted = e instanceof Error && e.name === 'AbortError';
    throw new ApiNetworkError(
      aborted
        ? 'Request timed out — check your connection.'
        : 'Could not reach the gateway. Check your connection and the API base URL.',
      path,
      e,
    );
  }
  clearTimeout(timer);

  const text = await res.text();
  let json: Record<string, unknown> = {};
  if (text) {
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      // Non-JSON body — typically a gateway error page (502/503/504 text or
      // HTML) when the backend is down. Surface a clean message instead of a
      // raw "JSON Parse error".
      throw new ApiError(
        res.status >= 500 || !res.ok
          ? 'Server is temporarily unavailable. Please try again in a moment.'
          : 'Unexpected response from the server.',
        res.status,
        path,
      );
    }
  }
  if (!res.ok) {
    const detail = (json as { detail?: unknown }).detail;
    const fallback = res.status >= 500
      ? 'Server is temporarily unavailable. Please try again in a moment.'
      : `HTTP ${res.status}`;
    throw new ApiError(formatApiDetail(detail, fallback), res.status, path, detail);
  }

  const tokens = json as unknown as AuthTokenResponse;
  if (!tokens.refresh_token) {
    const setCookie = res.headers.get('set-cookie') || '';
    const match = /pt_refresh=([^;,\s]+)/.exec(setCookie);
    if (match && match[1]) tokens.refresh_token = match[1];
  }
  return tokens;
}

export interface LoginPayload {
  email: string;
  password: string;
  totp_code?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  country?: string;
  referral_code?: string;
  /** Cloudflare Turnstile token. Solved on the register screen via the
   *  WebView-hosted TurnstileWidget (src/features/auth/TurnstileWidget.tsx)
   *  and verified server-side. Backend skips Turnstile when
   *  CLOUDFLARE_TURNSTILE_SECRET_KEY is empty (local/dev). */
  cf_turnstile_token?: string;
}

export const authApi = {
  login: (body: LoginPayload) => authTokenPost('/auth/login', body),

  demoLogin: () => authTokenPost('/auth/demo-login', {}),

  googleLogin: (idToken: string, referralCode?: string) =>
    authTokenPost('/auth/google', { id_token: idToken, referral_code: referralCode }),

  register: (body: RegisterPayload) =>
    api.post<{ email: string; verification_sent: boolean }>('/auth/register', body, {
      anonymous: true,
    }),

  resendVerification: (email: string) =>
    api.post<{ message: string }>('/auth/resend-verification', { email }, { anonymous: true }),

  verifyEmail: (token: string) =>
    api.get<AuthTokenResponse>('/auth/verify-email', { token }, { anonymous: true }),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }, { anonymous: true }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<{ message: string }>(
      '/auth/reset-password',
      { token, new_password: newPassword },
      { anonymous: true },
    ),

  platformStatus: () =>
    api.get<PlatformStatus>('/auth/platform-status', undefined, { anonymous: true }),
};
