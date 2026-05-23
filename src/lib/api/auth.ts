import api from './client';
import type { AuthTokenResponse, PlatformStatus } from '@/types/auth';

// Typed thin wrappers over the gateway's auth endpoints. Keeping the
// strings here means feature code doesn't litter URL paths, and a backend
// rename becomes a one-file edit instead of a grep across screens.

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
  /** Cloudflare Turnstile is web-only — mobile cannot solve the widget.
   *  Backend skips Turnstile when CLOUDFLARE_TURNSTILE_SECRET_KEY is empty.
   *  When the operator has Turnstile configured, mobile registration will
   *  400 until the backend either exempts mobile clients or accepts an
   *  alternative attestation. Flag for later. */
  cf_turnstile_token?: string;
}

export const authApi = {
  login: (body: LoginPayload) =>
    api.post<AuthTokenResponse>('/auth/login', body, { anonymous: true }),

  demoLogin: () =>
    api.post<AuthTokenResponse>('/auth/demo-login', {}, { anonymous: true }),

  googleLogin: (idToken: string, referralCode?: string) =>
    api.post<AuthTokenResponse>(
      '/auth/google',
      { id_token: idToken, referral_code: referralCode },
      { anonymous: true },
    ),

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

  setup2fa: () =>
    api.post<{ secret: string; qr_code_data_url: string; backup_codes: string[] }>('/auth/2fa/setup'),

  verify2fa: (code: string) =>
    api.post<{ two_factor_enabled: boolean }>('/auth/2fa/verify', { code }),
};
