import api from './client';
import { loadCachedInstruments, saveCachedInstruments } from '@/lib/cache/instrumentsCache';
import type { InstrumentInfo, TickData, MarketStatus } from '@/types/market';

export const instrumentsApi = {
  // NOTE: trailing slash is REQUIRED. The backend list route is `/instruments/`
  // (FastAPI `@router.get("/")`). Calling `/instruments` (no slash) triggers a
  // 307 redirect to `/instruments/` that, behind the production proxy, points at
  // http:// (cleartext) — Expo Go follows it, but a release Android APK BLOCKS
  // cleartext, so the list came back empty ONLY in the built app. Matching the
  // exact path avoids the redirect entirely.
  list: () => api.get<InstrumentInfo[]>('/instruments/'),

  /** Resilient instrument list — the fix for "no instruments in the APK".
   *  1) Retries the fetch 3× with backoff (handles cold-start / transient fails).
   *  2) On success, persists the list to disk for future launches.
   *  3) If ALL retries fail, returns the last cached list (so the screen is
   *     never empty once it has ever loaded). Only throws when there's no cache
   *     to fall back to — then the caller shows a real error + Retry. */
  listWithRetry: async (attempts = 3): Promise<InstrumentInfo[]> => {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        const list = await api.get<InstrumentInfo[]>('/instruments/');
        if (Array.isArray(list) && list.length > 0) {
          saveCachedInstruments(list);
          return list;
        }
        if (Array.isArray(list)) return list; // genuine empty from server
      } catch (e) {
        lastErr = e;
      }
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
    const cached = loadCachedInstruments();
    if (cached) return cached; // fall back to last-known list
    if (lastErr) throw lastErr;
    return [];
  },

  price: (symbol: string) => api.get<TickData>(`/instruments/${encodeURIComponent(symbol)}/price`),
  allPrices: () => api.get<TickData[]>('/instruments/prices/all'),
  marketStatus: (symbol: string) =>
    api.get<MarketStatus>(`/instruments/market-status/${encodeURIComponent(symbol)}`),
  allMarketStatus: () => api.get<Record<string, MarketStatus>>('/instruments/market-status'),

  /** Get historical bars. resolution accepts TV format ('1','5','15','30','60','240','D','1D'). */
  bars: (symbol: string, opts: { resolution: string; from?: number; to?: number; limit?: number }) =>
    api.get<{ time: number; open: number; high: number; low: number; close: number; volume: number }[]>(
      `/instruments/${encodeURIComponent(symbol)}/bars`,
      {
        resolution: opts.resolution,
        from: opts.from,
        to: opts.to,
        limit: opts.limit,
      },
    ),
};
