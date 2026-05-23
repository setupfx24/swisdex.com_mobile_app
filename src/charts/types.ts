export interface Candle {
  /** Bar-START epoch seconds (matches gateway's bar pipeline). */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export interface TimeframeMeta {
  key: Timeframe;
  label: string;
  /** TV resolution string the gateway accepts. */
  resolution: string;
  /** Bar duration in seconds — used for synthesising the next candle when
   *  live updates roll over. */
  durationSec: number;
}
