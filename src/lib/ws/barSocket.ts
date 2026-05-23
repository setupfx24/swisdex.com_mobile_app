import { getWebSocketBaseUrl } from './getWebSocketBaseUrl';

export interface ServerBar {
  time: number; // epoch seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type BarListener = (bar: ServerBar) => void;

/** /ws/bars — server pushes bar_update per (symbol, resolution) once the
 *  client has subscribed. Wire protocol matches the web port (see
 *  swisdesk/frontend/trader/src/lib/ws/barSocket.ts header comment). */
class BarSocket {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<BarListener>>(); // key = SYMBOL:resolution
  private connecting = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private explicitlyClosed = false;

  private subKey(symbol: string, resolution: string) {
    return `${symbol.toUpperCase()}:${resolution}`;
  }

  private connect() {
    if (this.connecting) return;
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.explicitlyClosed = false;
    this.connecting = true;

    try {
      this.ws = new WebSocket(`${getWebSocketBaseUrl()}/ws/bars`);
    } catch {
      this.connecting = false;
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.connecting = false;
      this.reconnectAttempts = 0;
      for (const key of this.listeners.keys()) {
        const [symbol, resolution] = key.split(':');
        this.send({ type: 'subscribe', symbol, resolution });
      }
      this.startPing();
    };

    this.ws.onmessage = (e) => {
      let msg: { type?: string; symbol?: string; resolution?: string; bar?: ServerBar };
      try {
        msg = JSON.parse((e as MessageEvent).data as string);
      } catch {
        return;
      }
      if (msg?.type === 'bar_update' && msg.symbol && msg.resolution && msg.bar) {
        const set = this.listeners.get(this.subKey(msg.symbol, msg.resolution));
        if (set) for (const cb of set) cb(msg.bar);
      }
    };

    this.ws.onclose = () => {
      this.connecting = false;
      this.stopPing();
      this.ws = null;
      if (!this.explicitlyClosed) this.scheduleReconnect();
    };
    this.ws.onerror = () => this.ws?.close();
  }

  private send(payload: Record<string, unknown>) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    try { this.ws.send(JSON.stringify(payload)); } catch { /* ignore */ }
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => this.send({ type: 'ping' }), 25_000);
  }
  private stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= 50) return;
    if (this.reconnectTimer) return;
    const delay = Math.min(1_000 * Math.pow(2, this.reconnectAttempts), 30_000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  subscribe(symbol: string, resolution: string, cb: BarListener): () => void {
    const key = this.subKey(symbol, resolution);
    let set = this.listeners.get(key);
    const wasEmpty = !set || set.size === 0;
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(cb);

    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) this.connect();
    if (wasEmpty && this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', symbol: symbol.toUpperCase(), resolution });
    }
    return () => {
      const s = this.listeners.get(key);
      if (!s) return;
      s.delete(cb);
      if (s.size === 0) {
        this.listeners.delete(key);
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.send({ type: 'unsubscribe', symbol: symbol.toUpperCase(), resolution });
        }
      }
    };
  }

  pause() {
    this.explicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPing();
    this.ws?.close();
    this.ws = null;
  }

  /** AppState resume: reopen and let onopen replay subscriptions. */
  resume() {
    if (this.listeners.size > 0) this.connect();
  }
}

export const barSocket = new BarSocket();
