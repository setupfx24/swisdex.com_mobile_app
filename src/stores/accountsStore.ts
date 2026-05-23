import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { accountsApi } from '@/lib/api/accounts';
import type { TradingAccount } from '@/types/accounts';

const KEY_ACTIVE = 'swisdex.active_account_id';

interface AccountsState {
  accounts: TradingAccount[];
  active: TradingAccount | null;
  loading: boolean;
  error: string | null;
  /** Fetch the full list. Restores the persisted active selection if it
   *  still exists in the new list; otherwise falls back to the first
   *  non-demo account, then the first demo account. */
  load: () => Promise<void>;
  setActive: (a: TradingAccount | null) => Promise<void>;
  /** Patch a single account in-place after a leverage/balance change so
   *  the switcher reflects the new value without a refetch. */
  patchAccount: (id: string, patch: Partial<TradingAccount>) => void;
  removeAccount: (id: string) => void;
  reset: () => void;
}

export const useAccountsStore = create<AccountsState>((set, get) => ({
  accounts: [],
  active: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const accounts = await accountsApi.list();
      const persistedId = await SecureStore.getItemAsync(KEY_ACTIVE).catch(() => null);
      const pick =
        accounts.find((a) => a.id === persistedId) ||
        accounts.find((a) => !a.is_demo) ||
        accounts[0] ||
        null;
      set({ accounts, active: pick, loading: false });
      if (pick && pick.id !== persistedId) {
        await SecureStore.setItemAsync(KEY_ACTIVE, pick.id).catch(() => {});
      }
    } catch (e: unknown) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Could not load accounts.',
      });
    }
  },

  setActive: async (a) => {
    set({ active: a });
    if (a) await SecureStore.setItemAsync(KEY_ACTIVE, a.id).catch(() => {});
    else await SecureStore.deleteItemAsync(KEY_ACTIVE).catch(() => {});
  },

  patchAccount: (id, patch) =>
    set((s) => ({
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      active: s.active?.id === id ? { ...s.active, ...patch } : s.active,
    })),

  removeAccount: (id) => {
    const { accounts, active } = get();
    const next = accounts.filter((a) => a.id !== id);
    set({
      accounts: next,
      active: active?.id === id ? (next[0] ?? null) : active,
    });
  },

  reset: () => set({ accounts: [], active: null, error: null }),
}));
