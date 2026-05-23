import api from './client';
import type { InstrumentInfo, TickData, MarketStatus } from '@/types/market';

export const instrumentsApi = {
  list: () => api.get<InstrumentInfo[]>('/instruments'),
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
