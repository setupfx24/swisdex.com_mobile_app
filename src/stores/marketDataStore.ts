import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { TickData, InstrumentInfo } from '@/types/market';

const KEY_WATCHLIST = 'swisdex.watchlist';

const DEFAULT_WATCHLIST = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD',
  'BTCUSD', 'ETHUSD', 'NAS100', 'US30',
];

interface State {
  prices: Record<string, TickData>;
  prevBids: Record<string, number>;
  watchlist: string[];
  instruments: InstrumentInfo[];
  selectedSymbol: string;
  setInstruments: (i: InstrumentInfo[]) => void;
  updateTick: (t: TickData) => void;
  setSelectedSymbol: (s: string) => void;
  hydrateWatchlist: () => Promise<void>;
  addToWatchlist: (s: string) => Promise<void>;
  removeFromWatchlist: (s: string) => Promise<void>;
}

export const useMarketDataStore = create<State>((set, get) => ({
  prices: {},
  prevBids: {},
  watchlist: DEFAULT_WATCHLIST,
  instruments: [],
  selectedSymbol: 'XAUUSD',

  setInstruments: (i) => set({ instruments: i }),

  // Hot path — called for every tick on every symbol. Keep this tight.
  updateTick: (t) => {
    const sym = t.symbol;
    set((s) => {
      const prev = s.prices[sym];
      return {
        prices: { ...s.prices, [sym]: t },
        prevBids: prev ? { ...s.prevBids, [sym]: prev.bid } : s.prevBids,
      };
    });
  },

  setSelectedSymbol: (s) => set({ selectedSymbol: s }),

  hydrateWatchlist: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY_WATCHLIST);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string') && parsed.length > 0) {
        set({ watchlist: parsed });
      }
    } catch {
      /* corrupt key, keep default */
    }
  },

  addToWatchlist: async (s) => {
    const sym = s.trim().toUpperCase();
    if (!sym) return;
    const { watchlist } = get();
    if (watchlist.includes(sym)) return;
    const next = [...watchlist, sym];
    set({ watchlist: next });
    await SecureStore.setItemAsync(KEY_WATCHLIST, JSON.stringify(next)).catch(() => {});
  },

  removeFromWatchlist: async (s) => {
    const { watchlist } = get();
    const next = watchlist.filter((x) => x !== s);
    set({ watchlist: next });
    await SecureStore.setItemAsync(KEY_WATCHLIST, JSON.stringify(next)).catch(() => {});
  },
}));
