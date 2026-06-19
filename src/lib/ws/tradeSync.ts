import { tradeSocket } from './tradeSocket';
import { useAccountsStore } from '@/stores/accountsStore';
import { usePositionsStore } from '@/stores/positionsStore';
import type { TradeEvent } from '@/types/market';

/**
 * Real-time cross-device sync.
 *
 * The gateway publishes every order fill / position close / balance change
 * for an account to `/ws/trades/{account_id}` — REGARDLESS of which client
 * caused it. So a trade placed on the web (or another phone) on the same
 * account lands on this socket too. We keep the trade socket bound to the
 * active account and, on any event, reload positions + accounts so the new
 * trade shows up here within a fraction of a second — no manual refresh.
 *
 * Requirement: the web and the app must point at the SAME gateway and be
 * signed into the SAME account for events to cross between them.
 *
 * Call once from the authenticated layout; the returned fn tears it down.
 */
export function startTradeSync(): () => void {
  let debounce: ReturnType<typeof setTimeout> | null = null;

  // Keep the trade socket attached to whatever account is active, and pull
  // a fresh snapshot right after (re)connecting so we don't miss a trade
  // that happened while we were on another account / backgrounded.
  const connectActive = () => {
    const active = useAccountsStore.getState().active;
    if (!active) return;
    void tradeSocket.connect(active.id);
    refresh();
  };

  // Debounced so a burst of fills triggers a single reload, not a storm.
  const refresh = () => {
    if (debounce) return;
    debounce = setTimeout(() => {
      debounce = null;
      const active = useAccountsStore.getState().active;
      if (active) void usePositionsStore.getState().load(active.id);
      // Refresh balance / equity / margin after a fill or close. load()
      // preserves the persisted active selection.
      void useAccountsStore.getState().load();
    }, 250);
  };

  connectActive();

  const unsubAccounts = useAccountsStore.subscribe((s, prev) => {
    if (s.active?.id !== prev.active?.id) connectActive();
  });

  const unsubTrade = tradeSocket.subscribe((_event: TradeEvent) => refresh());

  return () => {
    unsubAccounts();
    unsubTrade();
    if (debounce) {
      clearTimeout(debounce);
      debounce = null;
    }
  };
}
