import { create } from 'zustand';
import { positionsApi } from '@/lib/api/positions';
import { ordersApi } from '@/lib/api/orders';
import { useMarketDataStore } from './marketDataStore';
import { useAccountsStore } from './accountsStore';
import type { Position, OrderResponse } from '@/types/trading';
import type { InstrumentInfo } from '@/types/market';

interface State {
  positions: Position[];
  pendingOrders: OrderResponse[];
  loading: boolean;
  error: string | null;
  load: (accountId: string) => Promise<void>;
  /** Optimistic-insert a position synchronously so the panel reflects a
   *  market trade before the server round-trip. Caller is responsible for
   *  calling `load(accountId)` once the network result returns to
   *  reconcile. */
  injectOptimistic: (p: Position) => void;
  removePosition: (id: string) => void;
  replaceAll: (positions: Position[]) => void;
  /** Recompute current_price + profit for every position whose symbol
   *  just got a new tick. Hot path — runs on every tick the user has
   *  open in their positions. */
  applyTick: (symbol: string) => void;
}

export const usePositionsStore = create<State>((set, get) => ({
  positions: [],
  pendingOrders: [],
  loading: false,
  error: null,

  load: async (accountId: string) => {
    set({ loading: true, error: null });
    try {
      const [positions, pendingOrders] = await Promise.all([
        positionsApi.list(accountId, 'open'),
        ordersApi.list(accountId, 'pending').catch(() => []),
      ]);
      set({ positions, pendingOrders, loading: false });
    } catch (e: unknown) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Could not load positions.' });
    }
  },

  injectOptimistic: (p) =>
    set((s) => ({ positions: [p, ...s.positions] })),

  removePosition: (id) =>
    set((s) => ({ positions: s.positions.filter((p) => p.id !== id) })),

  replaceAll: (positions) => set({ positions }),

  applyTick: (symbol) => {
    const { prices } = useMarketDataStore.getState();
    const tick = prices[symbol];
    if (!tick) return;
    const { instruments } = useMarketDataStore.getState();
    const inst = instruments.find((i) => i.symbol === symbol);
    // contract_size arrives as a string ("100.0000") — coerce. If the spec
    // isn't loaded yet, DON'T fall back to the 100k forex default: that makes
    // metals/indices/crypto P&L ~1000× too large. Keep the backend's
    // authoritative profit until the real contract size is available.
    const cs = Number(inst?.contract_size);
    const contractSize = Number.isFinite(cs) && cs > 0 ? cs : null;

    set((s) => {
      const next = s.positions.map((p) => {
        if (p.symbol !== symbol) return p;
        const cp = p.side === 'buy' ? tick.bid : tick.ask;
        const profit = contractSize != null ? computePnL(p, cp, contractSize, inst) : p.profit;
        return { ...p, current_price: cp, profit };
      });
      return { positions: next };
    });
  },
}));

/** Forex P&L = (priceDelta) × lots × contractSize, expressed in the QUOTE
 *  currency. Convert to USD when quote ≠ USD so the user sees account-
 *  currency P&L. For unknown quotes / cross pairs we return the raw QC
 *  value — the backend reconciles correctly on close. */
function computePnL(
  pos: Position,
  cp: number,
  contractSize: number,
  inst: InstrumentInfo | undefined,
): number {
  const sym = pos.symbol;
  const base = (inst?.base_currency || (sym.length >= 6 ? sym.slice(0, 3) : '')).toUpperCase();
  const quote = (inst?.quote_currency || (sym.length >= 6 ? sym.slice(3, 6) : '')).toUpperCase();
  let pnl =
    pos.side === 'buy'
      ? (cp - pos.open_price) * pos.lots * contractSize
      : (pos.open_price - cp) * pos.lots * contractSize;
  if (quote && quote !== 'USD' && base === 'USD' && cp) {
    pnl = pnl / cp;
  }
  return pnl;
}

/** Hook up at the trading screens — calls applyTick for the active
 *  account's positions every time a relevant symbol ticks. */
export function bindPositionsToTicks(): () => void {
  const apply = usePositionsStore.getState().applyTick;
  const unsubMarket = useMarketDataStore.subscribe((state, prev) => {
    if (state.prices === prev.prices) return;
    // Walk through changed symbols only.
    const changed = new Set<string>();
    for (const sym of Object.keys(state.prices)) {
      if (state.prices[sym] !== prev.prices[sym]) changed.add(sym);
    }
    for (const sym of changed) apply(sym);
  });
  // Refetch positions whenever the active account changes.
  const unsubAccts = useAccountsStore.subscribe((state, prev) => {
    if (state.active?.id !== prev.active?.id && state.active) {
      void usePositionsStore.getState().load(state.active.id);
    }
  });
  return () => {
    unsubMarket();
    unsubAccts();
  };
}
