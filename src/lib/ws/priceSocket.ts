import { getWebSocketBaseUrl } from './getWebSocketBaseUrl';
import { extractTicksFromPayload } from './normalizePricePayload';
import type { TickData } from '@/types/market';

type Listener = (tick: TickData) => void;
type StatusListener = (status: 'connected' | 'connecting' | 'disconnected') => void;

/** Singleton price-tick socket. /ws/prices is auth-optional and broadcasts
 *  every symbol's bid/ask to every connected client (the server has no
 *  subscribe mechanism — filtering is the client's job). */
class PriceSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private explicitlyClosed = false;
  private _status: 'connected' | 'connecting' | 'disconnected' = 'disconnected';

  get status() { return this._status; }
  private setStatus(s: typeof this._status) {
    this._status = s;
    for (const l of this.statusListeners) l(s);
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;
    this.explicitlyClosed = false;
    this.setStatus('connecting');
    const url = `${getWebSocketBaseUrl()}/ws/prices`;
    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
    };
    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data as string);
        const ticks = extractTicksFromPayload(data);
        for (const t of ticks) for (const l of this.listeners) l(t);
      } catch {
        /* ignore malformed */
      }
    };
    this.ws.onclose = () => {
      this.setStatus('disconnected');
      this.ws = null;
      if (!this.explicitlyClosed) this.scheduleReconnect();
    };
    this.ws.onerror = () => this.ws?.close();
  }

  /** Disconnect WITHOUT clearing listeners. AppState background path uses
   *  this so subscribers stay attached and pick up the next reconnect
   *  the moment the user returns to the app. */
  pause() {
    this.explicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  /** Tear down completely (used on sign-out). */
  disconnect() {
    this.pause();
    this.listeners.clear();
    this.statusListeners.clear();
    this.reconnectAttempts = 0;
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= 20) return;
    if (this.reconnectTimer) return;
    const delay = Math.min(1_000 * Math.pow(2, this.reconnectAttempts), 30_000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (!this.ws) this.connect();
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this._status);
    return () => this.statusListeners.delete(listener);
  }
}

export const priceSocket = new PriceSocket();
