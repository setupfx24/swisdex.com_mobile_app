// Mirrors swisdesk/backend/packages/common/src/schemas/trading.py
// (TradingAccountResponse, AccountSummary) plus account_groups shape from
// accounts.py:available_groups.

export interface AccountGroupInfo {
  id: string;
  name: string;
  spread_markup: number;
  commission_per_lot: number;
  minimum_deposit: number;
  swap_free: boolean;
  leverage_default: number;
  /** Hard ceiling from migration 0020; falls back to leverage_default for legacy rows. */
  max_leverage?: number;
  /** Smaller of max_leverage and the per-user KYC cap (50 for non-KYC).
   *  Use this to clamp the leverage picker. */
  effective_max_leverage?: number;
}

export interface TradingAccount {
  id: string;
  account_number: string;
  balance: number;
  credit: number;
  equity: number;
  margin_used: number;
  free_margin: number;
  margin_level: number;
  leverage: number;
  currency: string;
  is_demo: boolean;
  account_group?: AccountGroupInfo | null;
}

export interface AccountSummary {
  balance: number;
  credit: number;
  equity: number;
  margin_used: number;
  free_margin: number;
  margin_level: number;
  unrealized_pnl: number;
  open_positions_count: number;
}

export interface AvailableAccountGroup {
  id: string;
  name: string;
  leverage_default: number;
  max_leverage: number;
  spread_markup_default: number;
  commission_default: number;
  minimum_deposit: number;
  swap_free: boolean;
  is_demo: boolean;
  is_active: boolean;
}

export interface Session {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_used_at: string | null;
  expires_at: string;
  is_current: boolean;
}
