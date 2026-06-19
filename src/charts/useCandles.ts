import { useEffect, useState } from 'react';
import { instrumentsApi } from '@/lib/api/instruments';
import { barSocket } from '@/lib/ws/barSocket';
import type { Candle, TimeframeMeta } from './types';

interface State {
  candles: Candle[];
  loading: boolean;
  error: string | null;
}

const HISTORY_BARS = 240; // ~4h of 1m, ~20h of 5m — enough density for screen

/** Fetch initial bars then keep the last candle in lock-step with the
 *  /ws/bars feed. The gateway publishes one update per tick for the
 *  open bar; once the bar rolls over the server emits the closed bar
 *  with the next start time, which we append. */
export function useCandles(symbol: string, tf: TimeframeMeta): State {
  const [state, setState] = useState<State>({ candles: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ candles: [], loading: true, error: null });

    instrumentsApi
      .bars(symbol, { resolution: tf.resolution, limit: HISTORY_BARS })
      .then((rows) => {
        if (cancelled) return;
        // Dedupe by timestamp — the gateway can return overlapping seeded +
        // live-aggregated bars for the current period, which would otherwise
        // produce two candles sharing a `time` (duplicate React key). Last
        // write wins, then sort ascending.
        const byTime = new Map<number, Candle>();
        for (const r of rows) byTime.set(r.time, r);
        const sorted = Array.from(byTime.values()).sort((a, b) => a.time - b.time);
        setState({ candles: sorted, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          candles: [],
          loading: false,
          error: e instanceof Error ? e.message : 'Could not load bars.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, tf.resolution]);

  useEffect(() => {
    if (!symbol) return;
    return barSocket.subscribe(symbol, tf.resolution, (bar) => {
      setState((s) => {
        const arr = s.candles;
        const last = arr[arr.length - 1];
        // Fast path: update to the current (last) bar.
        if (last && last.time === bar.time) {
          const next = arr.slice(0, -1);
          next.push(bar);
          return { ...s, candles: next };
        }
        // A bar for a timestamp we already hold (not the last one) — replace
        // in place so we never end up with two candles sharing a `time`.
        if (last && bar.time <= last.time) {
          const idx = arr.findIndex((c) => c.time === bar.time);
          if (idx !== -1) {
            const next = arr.slice();
            next[idx] = bar;
            return { ...s, candles: next };
          }
          return s; // stale bar older than everything shown — ignore.
        }
        // Genuinely new, newer bar — append; trim front to bound memory.
        const next = [...arr, bar];
        if (next.length > HISTORY_BARS * 2) next.splice(0, next.length - HISTORY_BARS * 2);
        return { ...s, candles: next };
      });
    });
  }, [symbol, tf.resolution]);

  return state;
}
