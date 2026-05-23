import * as Haptics from 'expo-haptics';
import { ordersApi } from '@/lib/api/orders';
import { usePositionsStore } from '@/stores/positionsStore';
import { useAccountsStore } from '@/stores/accountsStore';
import { useMarketDataStore } from '@/stores/marketDataStore';
import { generateMagicNumber, type PlaceOrderPayload, type Position } from '@/types/trading';

interface PlaceOptions {
  /** Best-effort optimistic injection for market orders — keeps the
   *  positions panel responsive while the network round-trip resolves. */
  optimistic?: boolean;
}

/** Place an order with the rules CLAUDE.md asks for:
 *  - magic_number is always set (int hash from time+random, traceability only)
 *  - Market orders inject an optimistic position synchronously so the
 *    panel updates immediately. The optimistic row is replaced when the
 *    next reload sees the server-authoritative state.
 *  - Backend has NO order idempotency. We do NOT auto-retry on network
 *    failure — caller surfaces the error and the user decides whether
 *    to retry (double-fill risk too high to retry silently). */
export async function placeOrder(
  payload: Omit<PlaceOrderPayload, 'magic_number'> & { magic_number?: number },
  opts: PlaceOptions = {},
) {
  const body: PlaceOrderPayload = {
    ...payload,
    magic_number: payload.magic_number ?? generateMagicNumber(),
  };

  let rollback: (() => void) | null = null;
  if (opts.optimistic && body.order_type === 'market') {
    const tick = useMarketDataStore.getState().prices[body.symbol];
    if (tick) {
      const execPrice = body.side === 'buy' ? tick.ask : tick.bid;
      const optimisticId = `optim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const optimisticPos: Position = {
        id: optimisticId,
        account_id: body.account_id,
        symbol: body.symbol,
        side: body.side,
        status: 'open',
        lots: body.lots,
        open_price: execPrice,
        current_price: execPrice,
        stop_loss: body.stop_loss ?? null,
        take_profit: body.take_profit ?? null,
        swap: 0,
        commission: 0,
        profit: 0,
        trade_type: 'self_trade',
        created_at: new Date().toISOString(),
      };
      const prev = usePositionsStore.getState().positions;
      usePositionsStore.getState().injectOptimistic(optimisticPos);
      rollback = () => usePositionsStore.setState({ positions: prev });
    }
  }

  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const res = await ordersApi.place(body);
    // Reconcile with server-authoritative state in background.
    const active = useAccountsStore.getState().active;
    if (active) void usePositionsStore.getState().load(active.id);
    return res;
  } catch (e) {
    rollback?.();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    throw e;
  }
}
