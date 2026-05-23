import api from './client';

export interface PortfolioSummary {
  total_equity: number;
  total_balance: number;
  total_unrealized_pnl: number;
  total_open_positions: number;
  accounts_count: number;
}

export interface EquityPoint {
  /** ISO timestamp or epoch seconds depending on backend; we accept both. */
  t: string | number;
  /** Equity value at that point. */
  v: number;
}

export interface PortfolioPerformance {
  equity_curve: EquityPoint[];
  win_rate: number;
  /** Total realized P&L over the window. */
  pnl: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  monthly_breakdown?: { month: string; pnl: number; trades: number }[];
  symbol_breakdown?: { symbol: string; pnl: number; trades: number }[];
}

export interface TradeRow {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  lots: number;
  open_price: number;
  close_price: number;
  profit: number;
  swap: number;
  commission: number;
  open_time: string;
  close_time: string;
  close_reason?: string;
}

export interface BalancePoint {
  t: string | number;
  balance: number;
}

export const portfolioApi = {
  summary: () => api.get<PortfolioSummary>('/portfolio/summary'),
  performance: (window: '7d' | '30d' | '90d' | '1y' = '30d') =>
    api.get<PortfolioPerformance>('/portfolio/performance', { window }),
  trades: (params: { account_id?: string; symbol?: string; page?: number; per_page?: number }) =>
    api.get<{ items: TradeRow[]; total: number; page: number; per_page: number; pages: number }>(
      '/portfolio/trades',
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string>,
    ),
  balanceHistory: (window: '24h' | '7d' | '30d' | '90d' | '1y' = '30d') =>
    api.get<BalancePoint[]>('/portfolio/balance-history', { window }),
  /** Returns a download URL or stream. We expose the raw response via
   *  fetch in the consumer since the API client only handles JSON. */
  exportPath: 'portfolio/export',
};
