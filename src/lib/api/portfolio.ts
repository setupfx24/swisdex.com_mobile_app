import api from './client';

export interface PnlBreakdown {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
}

/** Aggregated holding (from summary.holdings) — backend uses total_lots /
 *  avg_open_price / unrealized_pnl. We also accept the per-position shape. */
export interface PortfolioHolding {
  symbol: string;
  current_price: number;
  total_lots?: number;
  avg_open_price?: number;
  unrealized_pnl?: number;
  positions_count?: number;
  net_side?: string | null;
  // Per-position fallback fields (summary.open_positions).
  side?: string;
  lots?: number;
  entry_price?: number;
  pnl?: number;
  pnl_pct?: number;
}

export interface OpenPositionDetail {
  id: string;
  symbol: string;
  side: string;
  lots: number;
  entry_price: number;
  current_price: number;
  pnl: number;
}

export interface PortfolioSummary {
  total_balance: number;
  total_credit?: number;
  total_equity: number;
  total_unrealized_pnl: number;
  pnl_breakdown: PnlBreakdown;
  holdings: PortfolioHolding[];
  open_positions?: OpenPositionDetail[];
  open_positions_count: number;
}

/** Performance equity-curve point — backend sends { date, equity }. */
export interface PerfEquityPoint {
  date: string;
  equity: number;
}

export interface PerformanceStats {
  total_return: number;
  total_return_pct?: number;
  max_drawdown?: number;
  max_drawdown_pct?: number;
  sharpe_ratio: number;
  win_rate: number;
  total_trades: number;
  total_wins?: number;
  total_losses?: number;
}

export interface PortfolioPerformance {
  equity_curve: PerfEquityPoint[];
  stats: PerformanceStats;
  monthly_breakdown?: { month: string; profit: number }[];
  symbol_breakdown?: { symbol: string; profit: number; trades: number; wins?: number; win_rate?: number }[];
}

export type PerfPeriod = '1m' | '3m' | '6m' | '1y' | 'all' | 'custom';

/** Point shape consumed by the Skia EquityCurve chart (kept separate from
 *  the performance API's { date, equity } shape). */
export interface EquityPoint {
  t: string | number;
  v: number;
}

export interface TradeRow {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  lots: number;
  open_price: number;
  close_price: number;
  /** Realized P&L. Backend sends this as `pnl` (not `profit`). */
  pnl: number;
  swap: number;
  commission: number;
  opened_at?: string;
  close_time: string;
  close_reason?: string;
  trade_type?: string;
}

export interface BalancePoint {
  t: string | number;
  balance: number;
}

function clean(params: Record<string, string | number | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
  ) as Record<string, string>;
}

export const portfolioApi = {
  summary: (accountId?: string) =>
    api.get<PortfolioSummary>('/portfolio/summary', accountId ? { account_id: accountId } : undefined),
  performance: (params?: { period?: PerfPeriod; account_id?: string; date_from?: string; date_to?: string }) =>
    api.get<PortfolioPerformance>('/portfolio/performance', clean({
      period: params?.period ?? 'all',
      account_id: params?.account_id,
      date_from: params?.date_from,
      date_to: params?.date_to,
    })),
  trades: (params: { account_id?: string; symbol?: string; side?: 'buy' | 'sell'; date_from?: string; date_to?: string; page?: number; per_page?: number }) =>
    api.get<{ items: TradeRow[]; total: number; page: number; per_page: number; pages: number }>(
      '/portfolio/trades',
      clean(params),
    ),
  balanceHistory: (accountId: string, period: '24h' | '7d' | '30d' | '90d' | '1y' = '30d') =>
    api.get<BalancePoint[]>('/portfolio/balance-history', { account_id: accountId, period }),
  /** Returns a download URL or stream. We expose the raw response via
   *  fetch in the consumer since the API client only handles JSON. */
  exportPath: 'portfolio/export',
};
