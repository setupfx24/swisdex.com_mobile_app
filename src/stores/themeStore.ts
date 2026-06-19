import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const KEY_THEME = 'swisdex.theme_mode';

export type ThemeMode = 'light' | 'dark';

const isMode = (v: unknown): v is ThemeMode => v === 'light' || v === 'dark';

interface ThemeState {
  /** User's explicit theme choice — dark or light only. */
  mode: ThemeMode;
  /** True once SecureStore has been read at least once. */
  hydrated: boolean;
  /** Read the persisted choice. Fire-and-forget on first import (below). */
  hydrate: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  // Dark is the SwisDex canon default. (Legacy 'system' values fall back to
  // dark on hydrate since the option no longer exists.)
  mode: 'dark',
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY_THEME);
      if (isMode(raw)) set({ mode: raw, hydrated: true });
      else set({ hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setMode: async (mode) => {
    set({ mode });
    await SecureStore.setItemAsync(KEY_THEME, mode).catch(() => {});
  },
}));

// Hydrate once at module load — the persisted override resolves a few ms after
// boot. Stores own their own hydration here (app/_layout.tsx only bootstraps
// auth), mirroring marketDataStore's lazy SecureStore read.
void useThemeStore.getState().hydrate();
