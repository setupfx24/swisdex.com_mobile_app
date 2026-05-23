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
        const sorted = [...rows].sort((a, b) => a.time - b.time);
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
        const last = s.candles[s.candles.length - 1];
        if (last && last.time === bar.time) {
          // Same bar — replace in place.
          const next = s.candles.slice(0, -1);
          next.push(bar);
          return { ...s, candles: next };
        }
        // New bar — append; trim front so memory doesn't grow unbounded.
        const next = [...s.candles, bar];
        if (next.length > HISTORY_BARS * 2) next.splice(0, next.length - HISTORY_BARS * 2);
        return { ...s, candles: next };
      });
    });
  }, [symbol, tf.resolution]);

  return state;
}
