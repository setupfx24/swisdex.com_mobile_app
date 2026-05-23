import { create } from 'zustand';
import { notificationsApi } from '@/lib/api/notifications';
import type { AppNotification } from '@/types/notifications';

interface State {
  items: AppNotification[];
  unread: number;
  loading: boolean;
  start: () => void;
  stop: () => void;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

// Backend has NO push mechanism — mobile polls for badge + new items.
// Foreground poll cadence: 30s for the badge, full list refresh whenever
// the user opens /inbox.
let timer: ReturnType<typeof setInterval> | null = null;

function normalize(res: unknown): AppNotification[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as AppNotification[];
  if (typeof res === 'object' && 'items' in res) {
    return ((res as { items: AppNotification[] }).items) ?? [];
  }
  return [];
}

export const useNotificationsStore = create<State>((set) => ({
  items: [],
  unread: 0,
  loading: false,

  start: () => {
    if (timer) return;
    const tick = async () => {
      try {
        const r = await notificationsApi.unreadCount();
        set({ unread: r.count });
      } catch {
        /* swallow */
      }
    };
    void tick();
    timer = setInterval(() => void tick(), 30_000);
  },
  stop: () => {
    if (timer) clearInterval(timer);
    timer = null;
  },

  refresh: async () => {
    set({ loading: true });
    try {
      const res = await notificationsApi.list({ page: 1, per_page: 50 });
      const items = normalize(res);
      const unread = items.filter((n) => !n.is_read).length;
      set({ items, unread, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  markRead: async (id) => {
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      unread: Math.max(0, s.unread - 1),
    }));
    await notificationsApi.markRead(id).catch(() => {});
  },

  markAllRead: async () => {
    set((s) => ({ items: s.items.map((n) => ({ ...n, is_read: true })), unread: 0 }));
    await notificationsApi.markAllRead().catch(() => {});
  },
}));
