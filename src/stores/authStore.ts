import { create } from 'zustand';
import api, { ApiAuthError, ApiNetworkError } from '@/lib/api';
import {
  loadTokens,
  saveTokens,
  clearTokens,
  tokensFromAuthResponse,
} from '@/lib/storage/tokens';
import type { User, AuthTokenResponse } from '@/types/auth';

// The store holds derived UI state only — NEVER the raw tokens. SecureStore
// is the source of truth (see src/lib/storage/tokens.ts). Persisting the
// token here would defeat the whole point of putting it in the Keychain.

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: User | null;
  status: AuthStatus;
  /** When non-null, the last bootstrap/me failure was a network issue (not
   *  an auth issue) — UI can surface "gateway unreachable" instead of
   *  bouncing the user to login. */
  networkError: string | null;
  /** Called once on app boot from app/_layout.tsx. Reads SecureStore,
   *  validates the access token via GET /auth/me, sets user + status. */
  bootstrap: () => Promise<void>;
  /** Persist a fresh token envelope (from login / register / google) and
   *  fetch /auth/me to populate user state. Called by the Phase 4 login UI. */
  completeAuth: (tokens: AuthTokenResponse) => Promise<void>;
  /** Refresh the user profile (e.g. after KYC submit, profile edit). */
  refreshMe: () => Promise<void>;
  /** Best-effort server logout + always-clear local state. */
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'loading',
  networkError: null,

  bootstrap: async () => {
    const tokens = await loadTokens();
    if (!tokens) {
      set({ status: 'unauthenticated', user: null, networkError: null });
      return;
    }
    try {
      // client.ts handles proactive refresh automatically — by the time
      // /auth/me hits the wire the access token is guaranteed fresh.
      const user = await api.get<User>('/auth/me');
      set({ user, status: 'authenticated', networkError: null });
    } catch (e) {
      if (e instanceof ApiAuthError) {
        await clearTokens();
        set({ status: 'unauthenticated', user: null, networkError: null });
      } else if (e instanceof ApiNetworkError) {
        // Offline at boot — keep status='loading' equivalent UI but surface
        // the error so the user knows it's the gateway, not their creds.
        set({ status: 'unauthenticated', user: null, networkError: e.message });
      } else {
        // Unexpected — log out defensively so we don't render half-state.
        await clearTokens();
        set({ status: 'unauthenticated', user: null, networkError: null });
      }
    }
  },

  completeAuth: async (tokens) => {
    const stored = tokensFromAuthResponse(tokens);
    if (!stored) {
      // Backend's JWT_INCLUDE_REFRESH_IN_JSON is off — mobile cannot work.
      // Surface a clear message; the user can't fix this from the client.
      throw new Error(
        'Login succeeded but the gateway did not return a refresh token. ' +
          'Ask the backend operator to set JWT_INCLUDE_REFRESH_IN_JSON=true.',
      );
    }
    await saveTokens(stored);
    const user = await api.get<User>('/auth/me');
    set({ user, status: 'authenticated', networkError: null });
  },

  refreshMe: async () => {
    if (get().status !== 'authenticated') return;
    try {
      const user = await api.get<User>('/auth/me');
      set({ user });
    } catch {
      // Leave the existing user state untouched — refreshMe is a best-effort
      // update, not a state machine transition. A real auth failure will
      // surface via the next gated action.
    }
  },

  signOut: async () => {
    try {
      // Best-effort: revoke server-side. Ignore failures — local logout
      // must always succeed so the user isn't trapped.
      await api.post('/auth/logout', {});
    } catch {
      /* ignore */
    }
    await clearTokens();
    set({ user: null, status: 'unauthenticated', networkError: null });
  },
}));
