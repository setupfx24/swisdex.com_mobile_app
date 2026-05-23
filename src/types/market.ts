export interface TickData {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: string;
  spread: number;
}

export type InstrumentSegment = 'forex' | 'metals' | 'crypto' | 'indices' | 'stocks' | 'commodities' | string;

export interface InstrumentInfo {
  id: string;
  symbol: string;
  name?: string;
  segment: InstrumentSegment;
  digits: number;
  pip_size: number | string;
  lot_size?: number;
  min_lot: number | string;
  max_lot: number | string;
  lot_step?: number;
  contract_size: number;
  margin_rate?: number | string;
  base_currency?: string | null;
  quote_currency?: string | null;
  is_active: boolean;
}

export interface MarketStatus {
  is_open: boolean;
  reason?: string | null;
  /** ISO timestamp of next session boundary, if known. */
  next_open?: string | null;
  next_close?: string | null;
}

export type TradeEvent =
  | { type: 'order_filled'; [k: string]: unknown }
  | { type: 'position_closed'; [k: string]: unknown }
  | { type: 'balance_update'; [k: string]: unknown }
  | { type: 'pong' }
  | { type: 'ping' }
  | { type: string; [k: string]: unknown };
