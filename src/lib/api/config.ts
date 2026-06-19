// Env-driven config. EXPO_PUBLIC_* vars are inlined into the JS bundle at
// build time by Metro — there is no runtime fetch. Anything that isn't
// EXPO_PUBLIC_-prefixed is unavailable in the mobile bundle.
//
// Defaults below are dev-only conveniences (iOS simulator can reach
// localhost; physical devices CANNOT — set EXPO_PUBLIC_API_BASE to your LAN
// IP). Production builds bundle the real values via EAS env config.

const DEFAULT_API_BASE = 'http://localhost:8000/api/v1';
const DEFAULT_WS_BASE = 'ws://localhost:8000';

export const apiConfig = {
  /** Base URL for REST calls. Always ends without a trailing slash. */
  apiBase: (process.env.EXPO_PUBLIC_API_BASE || DEFAULT_API_BASE).replace(/\/$/, ''),
  /** Base URL for WebSocket channels (no path). */
  wsBase: (process.env.EXPO_PUBLIC_WS_BASE || DEFAULT_WS_BASE).replace(/\/$/, ''),
  /** Default request timeout — long enough for slow LP / market-data round-
   *  trips, short enough to surface a "gateway down" toast before the user
   *  thinks the app is frozen. Mirrors the web client's 60s ceiling. */
  requestTimeoutMs: 60_000,
  /** Refresh the access token this many ms before its expiry. Avoids the
   *  always-need-a-refresh-cycle that happens if we wait for an actual
   *  401 — for an in-flight order placement that latency adds up. */
  refreshLeadMs: 60_000,
  /** Max 429 retries on a single GET. POST/PUT/DELETE never retry: a 429 on
   *  a write means rate-limit, and a silent re-submission could double-book
   *  an order. */
  max429Retries: 3,
  /** Google Sign-In web client ID (same value as the web trader's
   *  NEXT_PUBLIC_GOOGLE_CLIENT_ID). Empty string disables the Google
   *  button on the login screen. */
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
  /** Cloudflare Turnstile site key (public) — same value as the web
   *  trader's NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY. Used to render the
   *  CAPTCHA widget on the register screen so production (which requires a
   *  token) accepts mobile sign-ups. Empty string hides the widget. */
  turnstileSiteKey:
    process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAADNQN3w9syN3T-E6',
} as const;
