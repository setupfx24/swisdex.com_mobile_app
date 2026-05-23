import { apiConfig } from './config';
import { ApiAuthError, ApiNetworkError } from './errors';
import {
  loadTokens,
  saveTokens,
  clearTokens,
  tokensFromAuthResponse,
  type StoredTokens,
} from '@/lib/storage/tokens';

// Single-flight refresh: if 3 requests 401 simultaneously, only ONE actually
// hits POST /auth/refresh — the other two await the in-flight promise and
// then retry with the new access token. Without this lock we'd rotate the
// refresh token N times (one of those rotations wins, the others 401 again,
// and the user gets bounced to login on a perfectly healthy session).

let inFlight: Promise<StoredTokens | null> | null = null;

async function doRefresh(): Promise<StoredTokens | null> {
  const current = await loadTokens();
  if (!current) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), apiConfig.requestTimeoutMs);

  let res: Response;
  try {
    res = await fetch(`${apiConfig.apiBase}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: current.refresh }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    // Network failure during refresh — DON'T clear tokens; the user is
    // likely offline and we'd boot them to login the moment connectivity
    // came back. Let the caller surface "gateway unreachable" instead.
    throw new ApiNetworkError(
      'Could not reach the gateway to refresh your session.',
      '/auth/refresh',
      e,
    );
  }
  clearTimeout(timer);

  if (!res.ok) {
    // The refresh token is gone / revoked / expired. Clear local tokens so
    // the next bootstrap shows the login screen instead of looping.
    await clearTokens();
    return null;
  }

  const body = await res.json().catch(() => null);
  if (!body) {
    await clearTokens();
    return null;
  }

  const next = tokensFromAuthResponse(body);
  if (!next) {
    // Backend returned 200 but without refresh_token in body — means
    // JWT_INCLUDE_REFRESH_IN_JSON is off on the server. Mobile cannot
    // continue. Bail to login so the user re-auths once and we can
    // request the flag-on path next time.
    await clearTokens();
    return null;
  }

  await saveTokens(next);
  return next;
}

/** Ensure we have a non-expired access token. If `force=true` we refresh
 *  even when the current token is still valid (used by the 401-retry path
 *  since the backend already invalidated the access token). Returns null
 *  when no usable session remains — caller should redirect to login. */
export async function ensureFreshTokens(force = false): Promise<StoredTokens | null> {
  if (inFlight) return inFlight;

  const current = await loadTokens();
  if (!current) return null;

  if (!force && current.accessExpiresAtMs > Date.now() + apiConfig.refreshLeadMs) {
    // Token is still valid for a meaningful window.
    return current;
  }

  inFlight = doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Caller-side helper for the 401 path of client.ts. Throws ApiAuthError
 *  when refresh fails so the caller's catch can dispatch a logout. */
export async function refreshAfter401(path: string): Promise<StoredTokens> {
  const next = await ensureFreshTokens(true);
  if (!next) {
    throw new ApiAuthError('Session expired — please sign in again.', path);
  }
  return next;
}
