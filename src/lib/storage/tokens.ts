import * as SecureStore from 'expo-secure-store';

// SecureStore is the source of truth for auth state. We never persist tokens
// to AsyncStorage / Zustand — both leak via React DevTools in dev builds and
// AsyncStorage is plaintext on disk. SecureStore uses Keychain on iOS and
// EncryptedSharedPreferences on Android.

const KEY_ACCESS = 'swisdex.access_token';
const KEY_REFRESH = 'swisdex.refresh_token';
const KEY_EXPIRES = 'swisdex.access_expires_at_ms';

export interface StoredTokens {
  access: string;
  refresh: string;
  /** Epoch milliseconds when the access token expires. Used by refresh.ts
   *  to refresh proactively before an in-flight request can 401. */
  accessExpiresAtMs: number;
}

export async function loadTokens(): Promise<StoredTokens | null> {
  const [access, refresh, expiresRaw] = await Promise.all([
    SecureStore.getItemAsync(KEY_ACCESS),
    SecureStore.getItemAsync(KEY_REFRESH),
    SecureStore.getItemAsync(KEY_EXPIRES),
  ]);
  // Access token is required; refresh may be absent when the gateway runs in
  // cookie mode and we couldn't lift pt_refresh from the login Set-Cookie.
  // The session still works on the access token until it expires.
  if (!access) return null;
  const accessExpiresAtMs = Number(expiresRaw);
  // Treat a corrupt timestamp as "expired now" — refresh.ts will trigger a
  // refresh before the next request, recovering cleanly.
  return {
    access,
    refresh: refresh ?? '',
    accessExpiresAtMs: Number.isFinite(accessExpiresAtMs) ? accessExpiresAtMs : 0,
  };
}

export async function saveTokens(t: StoredTokens): Promise<void> {
  // Write sequentially-but-fast (Promise.all). If one of the three fails
  // halfway through, the next load will see an inconsistent set — the load
  // helper above guards against that by requiring access+refresh to both
  // exist.
  await Promise.all([
    SecureStore.setItemAsync(KEY_ACCESS, t.access),
    SecureStore.setItemAsync(KEY_REFRESH, t.refresh),
    SecureStore.setItemAsync(KEY_EXPIRES, String(t.accessExpiresAtMs)),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_ACCESS).catch(() => {}),
    SecureStore.deleteItemAsync(KEY_REFRESH).catch(() => {}),
    SecureStore.deleteItemAsync(KEY_EXPIRES).catch(() => {}),
  ]);
}

/** Helper: convert the backend's TokenResponse to StoredTokens.
 *  Backend returns access_token + refresh_token (mobile flag on) + expires_at
 *  as an ISO string. We persist the expiry as epoch ms for cheap arithmetic. */
export function tokensFromAuthResponse(res: {
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
}): StoredTokens | null {
  if (!res.access_token) return null;
  const t = Date.parse(res.expires_at);
  return {
    access: res.access_token,
    refresh: res.refresh_token ?? '',
    accessExpiresAtMs: Number.isFinite(t) ? t : Date.now() + 30 * 60_000,
  };
}
