import { getWebSocketBaseUrl } from './getWebSocketBaseUrl';
import { loadTokens } from '@/lib/storage/tokens';
import type { TradeEvent } from '@/types/market';

type Listener = (event: TradeEvent) => void;

/** /ws/trades/{account_id} — Bearer required via ?token= query string.
 *  Emits order_filled / position_closed / balance_update. Reconnect
 *  with backoff; on reconnect re-attaches listeners (no resubscribe
 *  needed — the channel is implicit in the URL path). */
class TradeSocket {
  private ws: WebSocket | null = null;
  private accountId: string | null = null;
  private listeners = new Set<Listener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private explicitlyClosed = false;

  async connect(accountId: string) {
    if (this.accountId === accountId && (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING)) return;
    this.explicitlyClosed = false;
    // If switching accounts, drop the old socket first.
    if (this.accountId && this.accountId !== accountId) this.pause();
    this.accountId = accountId;

    const tokens = await loadTokens();
    if (!tokens) return; // no auth = can't connect
    const url = `${getWebSocketBaseUrl()}/ws/trades/${encodeURIComponent(accountId)}?token=${encodeURIComponent(tokens.access)}`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };
    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data as string) as TradeEvent;
        for (const l of this.listeners) l(data);
      } catch {
        /* ignore */
      }
    };
    this.ws.onclose = () => {
      this.ws = null;
      if (!this.explicitlyClosed) this.scheduleReconnect();
    };
    this.ws.onerror = () => this.ws?.close();
  }

  pause() {
    this.explicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  /** Returns whatever account we're (or were last) bound to. AppState
   *  resume uses this to know whether to call connect() again. */
  get currentAccountId() {
    return this.accountId;
  }

  disconnect() {
    this.pause();
    this.listeners.clear();
    this.accountId = null;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private scheduleReconnect() {
    if (!this.accountId) return;
    if (this.reconnectAttempts >= 20) return;
    if (this.reconnectTimer) return;
    const delay = Math.min(1_000 * Math.pow(2, this.reconnectAttempts), 30_000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.accountId) void this.connect(this.accountId);
    }, delay);
  }
}

export const tradeSocket = new TradeSocket();
