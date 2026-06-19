import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const KEY_COMPLETED = 'swisdex.academy_completed';

interface AcademyState {
  /** Completed module ids (e.g. '1.1', '2.3'). Mirrors the web localStorage
   *  key `academy_completed`; academy is 100% client-side with no backend. */
  completed: string[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  isComplete: (id: string) => boolean;
  markComplete: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  /** Number of completed modules — drives the overall progress bar. */
  completedCount: () => number;
}

async function persist(completed: string[]) {
  await SecureStore.setItemAsync(KEY_COMPLETED, JSON.stringify(completed)).catch(() => {});
}

export const useAcademyStore = create<AcademyState>((set, get) => ({
  completed: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY_COMPLETED);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
          set({ completed: parsed, hydrated: true });
          return;
        }
      }
    } catch {
      /* corrupt key, keep default */
    }
    set({ hydrated: true });
  },

  isComplete: (id) => get().completed.includes(id),

  markComplete: async (id) => {
    const { completed } = get();
    if (completed.includes(id)) return;
    const next = [...completed, id];
    set({ completed: next });
    await persist(next);
  },

  toggleComplete: async (id) => {
    const { completed } = get();
    const next = completed.includes(id)
      ? completed.filter((x) => x !== id)
      : [...completed, id];
    set({ completed: next });
    await persist(next);
  },

  completedCount: () => get().completed.length,
}));
