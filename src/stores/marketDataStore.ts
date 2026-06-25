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
  /** First bid seen this session per symbol — the reference for the % change
   *  shown in the watchlist (the backend sends no daily open / prev-close, so
   *  "change since the app started streaming" is the best available signal). */
  sessionOpen: Record<string, number>;
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

// --- Tick coalescing buffer (perf) --------------------------------------
// /ws/prices broadcasts EVERY symbol in a single message, so the socket
// handler calls updateTick() dozens of times in one synchronous burst.
// Doing a store set() per tick spreads the whole prices map each time
// (O(n) × n ticks = O(n²) per message) and re-runs every subscriber's
// equality check — that floods the JS thread and janks navigation/scroll.
//
// Instead we stash incoming ticks in a plain mutable buffer and flush them
// into the store ONCE per animation frame. A 50-symbol message collapses
// from 50 store updates to 1, at the cost of ≤1 frame (~16ms) of latency —
// imperceptible for a price display, and market orders reconcile against
// the server fill price anyway.
let tickBuffer: Record<string, TickData> = {};
let flushScheduled = false;
let flushApply: (() => void) | null = null;

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  requestAnimationFrame(() => {
    flushScheduled = false;
    flushApply?.();
  });
}

export const useMarketDataStore = create<State>((set, get) => ({
  prices: {},
  prevBids: {},
  sessionOpen: {},
  watchlist: DEFAULT_WATCHLIST,
  instruments: [],
  selectedSymbol: 'XAUUSD',

  setInstruments: (i) => set({ instruments: i }),

  // Hot path — called once per symbol per WS message. We do NOT touch the
  // store here; we only stash the latest tick per symbol and schedule a
  // single coalesced flush (see scheduleFlush / flushApply above). This
  // turns a burst of N synchronous updateTick() calls into one store set().
  updateTick: (t) => {
    tickBuffer[t.symbol] = t;
    scheduleFlush();
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

// Drain the tick buffer into the store in a single set(). Runs at most once
// per frame. Cloning prices/prevBids once and mutating the clone keeps this
// O(symbols-changed) instead of O(symbols²). New object identities are only
// produced when at least one tick actually arrived, so subscribers that read
// an unchanged symbol still bail out of re-rendering.
flushApply = () => {
  const buffered = tickBuffer;
  const symbols = Object.keys(buffered);
  if (symbols.length === 0) return;
  tickBuffer = {};

  useMarketDataStore.setState((s) => {
    const prices = { ...s.prices };
    const prevBids = { ...s.prevBids };
    let sessionOpen = s.sessionOpen;
    let sessionOpenChanged = false;
    for (const sym of symbols) {
      const t = buffered[sym];
      if (!t) continue;
      const prev = prices[sym];
      if (prev) prevBids[sym] = prev.bid;
      prices[sym] = t;
      // Record the first valid bid we ever see for this symbol as the session
      // reference — never overwritten, so the % drifts as the price moves.
      if (s.sessionOpen[sym] == null && Number.isFinite(t.bid) && t.bid > 0) {
        if (!sessionOpenChanged) { sessionOpen = { ...s.sessionOpen }; sessionOpenChanged = true; }
        sessionOpen[sym] = t.bid;
      }
    }
    return sessionOpenChanged ? { prices, prevBids, sessionOpen } : { prices, prevBids };
  });
};
