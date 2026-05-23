import { create } from 'zustand';
import { authApi } from '@/lib/api/auth';
import type { PlatformStatus } from '@/types/auth';

interface State {
  status: PlatformStatus | null;
  error: string | null;
  start: () => void;
  stop: () => void;
}

// CLAUDE.md / audit: admin-controlled flags have no push mechanism — mobile
// must poll every 60s. We keep a single timer per app lifetime so every
// screen that needs the maintenance flag gets the same fresh data.

let timer: ReturnType<typeof setInterval> | null = null;

export const usePlatformStatusStore = create<State>((set) => ({
  status: null,
  error: null,
  start: () => {
    if (timer) return;
    const tick = async () => {
      try {
        const status = await authApi.platformStatus();
        set({ status, error: null });
      } catch (e: unknown) {
        set({ error: e instanceof Error ? e.message : 'Could not load platform status.' });
      }
    };
    void tick();
    timer = setInterval(() => void tick(), 60_000);
  },
  stop: () => {
    if (timer) clearInterval(timer);
    timer = null;
  },
}));
