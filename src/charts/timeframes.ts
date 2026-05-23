import type { TimeframeMeta } from './types';

export const TIMEFRAMES: TimeframeMeta[] = [
  { key: '1m',  label: '1m',  resolution: '1',   durationSec: 60 },
  { key: '5m',  label: '5m',  resolution: '5',   durationSec: 300 },
  { key: '15m', label: '15m', resolution: '15',  durationSec: 900 },
  { key: '30m', label: '30m', resolution: '30',  durationSec: 1_800 },
  { key: '1h',  label: '1H',  resolution: '60',  durationSec: 3_600 },
  { key: '4h',  label: '4H',  resolution: '240', durationSec: 14_400 },
  { key: '1d',  label: '1D',  resolution: '1D',  durationSec: 86_400 },
];

export function timeframeFor(key: string): TimeframeMeta {
  return TIMEFRAMES.find((t) => t.key === key) ?? TIMEFRAMES[1]!;
}
