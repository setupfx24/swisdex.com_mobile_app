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
  /** Admin per-account-type flag (migration 0070). When false, trade insurance
   *  is hidden on the order ticket. Absent → treated as enabled. */
  insurance_enabled?: boolean;
  /** Cent account (migration 0068): money is shown in ¢ (USD value ×100). */
  is_cent_account?: boolean;
  /** Lot scaling factor (migration 0069): 0.01 for cent groups, else 1. */
  lot_size_multiplier?: number;
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

// Mirrors the web AccountTypePickerModal's AvailableAccountGroup (the real
// /accounts/available-groups shape). The demo pool is fetched separately via
// ?is_demo=true rather than an is_demo flag per row.
export interface AvailableAccountGroup {
  id: string;
  name: string;
  description?: string;
  leverage_default: number;
  /** Hard cap (migration 0020); falls back to leverage_default for legacy rows. */
  max_leverage?: number;
  /** Per-user effective ceiling (smaller of group cap, KYC gate, XP gate). */
  effective_max_leverage?: number;
  kyc_unlock_required?: boolean;
  xp_unlock_required?: boolean;
  xp_for_next_unlock?: number | null;
  next_unlock_leverage?: number | null;
  minimum_deposit: number;
  spread_markup: number;
  commission_per_lot: number;
  /** Percentage brokerage fee (e.g. 0.0006 = 0.06%). Null on legacy rows. */
  commission_pct?: number | null;
  swap_free: boolean;
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
