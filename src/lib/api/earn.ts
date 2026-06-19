// Phase-12 typed wrappers for the Earn + Social surface. Grouped in one
// file because each domain's mobile read is small — separate files would
// add ceremony without payoff. If any of these grow (e.g. PAMM invest
// flow) split them out then.

import api from './client';

// ─── Fixed Return ────────────────────────────────────────────────────
export interface FixedReturnTier {
  tenure_label: string;
  tenure_days: number;
  rate_pct: number;
}
export interface FixedReturnTierDef {
  label: string;
  min_amount: number;
}
export interface FixedReturnTenure {
  label: string;
  days: number;
}
export interface FixedReturnConfig {
  // Legacy ladder (kept so the old read path still types). New backend
  // shape returns tiers/tenures/rate_matrix_pct — used by the lock form.
  tiers?: FixedReturnTier[] | FixedReturnTierDef[];
  tenures?: FixedReturnTenure[];
  rate_matrix_pct?: number[][];
  lock_months?: number;
  early_withdrawal_fee_pct: number;
}
export interface FixedReturnLock {
  id: string;
  principal: number;
  tenure_label: string;
  accrued_interest: number;
  status: 'active' | 'matured' | 'withdrawn';
  created_at: string;
  matures_at: string;
  // Richer fields from the new backend shape — all optional.
  tier_label?: string;
  rate_pct?: number;
  state?: 'active' | 'early_pending' | 'matured' | 'withdrawn_early';
  total_interest_paid?: number;
  interest_to_date?: number;
  next_payout_at?: string | null;
}

export const fixedReturnApi = {
  config: () => api.get<FixedReturnConfig>('/fixed-return/config'),
  locks: () => api.get<FixedReturnLock[]>('/fixed-return/locks'),
  lock: (body: { tier?: string; tenure: string; amount: number }) =>
    api.post<FixedReturnLock>('/fixed-return/lock', {
      principal: body.amount,
      tenure_label: body.tenure,
      ...(body.tier ? { tier_label: body.tier } : {}),
    }),
  withdrawLock: (id: string) =>
    api.post<{ message?: string }>(`/fixed-return/locks/${id}/withdraw`, {}),
};

// ─── Insurance ───────────────────────────────────────────────────────
export interface InsurancePolicy {
  id: string;
  position_id?: string | null;
  // Backend returns instrument_symbol (not "symbol"); keep both optional
  // so older shapes don't break.
  instrument_symbol?: string | null;
  symbol?: string | null;
  tier: string;
  fee: number;
  coverage_pct: number;
  max_cap: number;
  status: 'active' | 'claimed' | 'expired' | 'denied' | string;
  activated_at: string;
  settled_at?: string | null;
  /** Why the policy ended up denied / expired. Code from backend
   *  (min_duration, daily_claim_limit, not_a_loss, hedge,
   *  policy_expired, …). Map to a friendly label via insuranceReasonLabel. */
  settled_reason?: string | null;
}

export interface InsuranceTierQuote {
  tier: string;
  fee: number;
  coverage_pct: number;
  max_cap: number;
  estimated_refund: number;
  risk_score: number;
}
export interface InsuranceQuoteRequest {
  account_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  lots: number;
  leverage?: number;
  stop_loss?: number;
  take_profit?: number;
}

export type InsuranceClaimStatus = 'pending' | 'paid';

/** Rich claim shape mirroring the web trader's ClaimOut. The gateway stores
 *  the money fields as strings — coerce with Number() before formatting. */
export interface InsuranceClaim {
  id: string;
  policy_id: string;
  loss_amount: string | number;
  claim_amount: string | number;
  status: InsuranceClaimStatus;
  paid_at: string | null;
  claimed_at: string | null;
  instrument_symbol: string | null;
  tier: string | null;
}

export interface InsuranceClaimPayResult {
  claim_id: string;
  amount: string;
  /** 'credit' = tradable trading credit; 'balance' = withdrawable main balance. */
  credited_to: 'credit' | 'balance';
  status: 'paid';
}

/** Map a backend settled_reason code to a user-facing sentence. Mirrors the
 *  web trader's formatReason() so denied/expired policies read identically. */
export function insuranceReasonLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    not_a_loss: 'Trade closed in profit — no claim',
    min_duration: 'Trade closed too quickly (anti-abuse minimum)',
    hedge: 'Hedge detected on the same instrument',
    cooldown: 'Cooldown window between claims is still active',
    daily_claim_limit: 'Daily claim limit reached',
    daily_payout_limit: 'Daily payout cap reached',
    vol_too_low: 'Market volatility too low',
    vol_too_high: 'Market volatility too high',
    news_blackout: 'News blackout — claims paused',
    insurance_disabled: 'Insurance was disabled at close time',
    policy_expired: 'Trade closed after the policy validity window',
    cap_exhausted: 'Coverage cap already paid out on prior partial closes',
    zero_payout: 'Calculated payout was zero',
  };
  return map[code] ?? code.replace(/_/g, ' ');
}

/** Tier label: legacy enum (basic/advanced/pro/elite) → Titlecase; modern
 *  labels like "50%" render verbatim. Mirrors web formatTier/formatTierLabel. */
export function insuranceTierLabel(t: string | null | undefined): string {
  if (!t) return '—';
  const s = t.trim();
  if (!s) return '—';
  if (s.includes('%')) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export const insuranceApi = {
  active: () => api.get<InsurancePolicy[]>('/insurance/active'),
  policies: (limit = 100) => api.get<InsurancePolicy[]>(`/insurance/policies?limit=${limit}`),
  claims: (limit = 100, status?: InsuranceClaimStatus) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (status) params.set('status', status);
    return api.get<InsuranceClaim[]>(`/insurance/claims?${params.toString()}`);
  },
  quote: (body: InsuranceQuoteRequest) =>
    api.post<InsuranceTierQuote[]>('/insurance/quote', body),
  activate: (body: { position_id: string; tier: string }) =>
    api.post<{ policy_id: string; status: string }>('/insurance/activate', body),
  claim: (claimId: string) =>
    api.post<InsuranceClaimPayResult>(`/insurance/claims/${claimId}/claim`, {}),
};

// ─── Copy Trading / Social ────────────────────────────────────────────
export interface LeaderboardEntry {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  total_return_pct: number;
  followers_count: number;
  sharpe_ratio?: number | null;
  equity?: number | null;
  is_verified: boolean;
}
export interface CopyAllocation {
  id: string;
  master_user_id: string;
  amount: number;
  status: 'pending' | 'active' | 'paused' | 'stopped';
  created_at: string;
}

// ─── Rich MAMM / Social shapes (mobile /social page) ──────────────────
// These mirror the web /social Provider/ProviderDetail/CopySubscription
// shapes. The leaderboard endpoint returns a PaginatedResponse<Provider>.
export interface Provider {
  id: string;
  user_id: string;
  provider_name: string;
  total_return_pct: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  followers_count: number;
  performance_fee_pct: number;
  min_investment: number;
  description: string;
  strategy_info: Record<string, string> | null;
  created_at: string;
  is_copying: boolean;
}
export interface ProviderDetail extends Provider {
  active_investors: number;
  total_trades: number;
  total_profit: number;
  win_rate: number;
  monthly_breakdown: { month: string; profit: number }[];
}
export interface CopySubscription {
  id: string;
  master_id: string;
  provider_name: string;
  allocation_amount: number;
  total_profit: number;
  total_return_pct: number;
  copy_type: 'signal' | 'pamm' | 'mam' | string;
  status: string;
  created_at: string;
}
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
export type LeaderboardSort = 'total_return_pct' | 'sharpe_ratio' | 'followers_count';

/** Provider application / dashboard payload. Fields are all optional —
 *  the backend returns a sparse shape when no application exists yet and
 *  a rich one once approved. */
export interface ProviderApplication {
  id?: string;
  master_type?: string;
  status?: 'pending' | 'approved' | 'rejected' | string;
  performance_fee_pct?: number;
  min_investment?: number;
  max_investors?: number;
  description?: string | null;
  strategy_info?: Record<string, string> | null;
  created_at?: string;
  // Dashboard stats (present once approved)
  followers_count?: number;
  active_investors?: number;
  total_aum?: number;
  open_positions?: number;
  commission_earned?: number;
  total_investor_profit?: number;
  management_fee_pct?: number;
  today_trades?: number;
  today_profit?: number;
  total_trades?: number;
  win_rate?: number;
  total_return_pct?: number;
  max_drawdown_pct?: number;
  sharpe_ratio?: number;
  total_profit?: number;
}
export interface Follower {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  account_number?: string;
  allocation_amount: number;
  total_profit: number;
  profit_pct: number;
  total_copied_trades?: number;
  joined_at: string;
}
export interface BecomeProviderParams {
  master_type?: string;
  performance_fee_pct: number | string;
  management_fee_pct?: number | string;
  min_investment: number | string;
  max_investors: number | string;
  description?: string;
  strategy_info?: Record<string, string>;
}

/** PAMM/MAM manager performance dashboard (GET /social/master-performance). */
export interface MasterMonthlyRow {
  month: string;
  profit: number;
  cumulative: number;
}
export interface MasterPerformance {
  id: string;
  status: string;
  master_type: string;
  total_aum: number;
  total_investors: number;
  fee_earnings: number;
  total_return_pct: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  performance_fee_pct: number;
  management_fee_pct: number;
  admin_commission_pct: number;
  min_investment: number;
  max_investors: number;
  description: string | null;
  monthly_breakdown: MasterMonthlyRow[];
}
export interface MasterInvestor {
  id: string;
  user_name: string;
  user_email: string;
  account_number: string;
  allocated: number;
  pnl: number;
  pnl_pct: number;
  share_pct: number;
  copy_type: string;
  joined_at: string;
}

export const socialApi = {
  // Zero-arg leaderboard() hits the bare endpoint; with a sort/page it
  // mirrors the web /social leaderboard and returns a PaginatedResponse.
  leaderboard: (params?: { sort_by?: LeaderboardSort; page?: number; per_page?: number }) =>
    api.get<{ items: LeaderboardEntry[] } | LeaderboardEntry[]>(
      '/social/leaderboard',
      params
        ? {
            sort_by: params.sort_by ?? 'total_return_pct',
            page: params.page ?? 1,
            per_page: params.per_page ?? 20,
          }
        : undefined,
    ),
  /** Rich, paginated leaderboard for the mobile /social page. */
  leaderboardPage: (sortBy: LeaderboardSort = 'total_return_pct', page = 1, perPage = 20) =>
    api.get<PaginatedResponse<Provider>>('/social/leaderboard', {
      sort_by: sortBy,
      page,
      per_page: perPage,
    }),
  providerDetail: (id: string) => api.get<ProviderDetail>(`/social/providers/${id}`),
  myCopies: () => api.get<CopyAllocation[]>('/social/my-copies'),
  /** {items:[]} wrapped subscriptions for the mobile My Subscriptions tab. */
  mySubscriptions: () =>
    api.get<{ items: CopySubscription[]; total?: number } | CopySubscription[]>('/social/my-copies'),
  // Web mirrors the master via querystring: /social/copy?master_id=&account_id=&amount=
  startCopy: (masterId: string, accountId: string, amount: number) =>
    api.post<CopyAllocation>('/social/copy', {}, {
      params: { master_id: masterId, account_id: accountId, amount },
    }),
  /** Alias used by the mobile /social page (same querystring contract). */
  copy: (masterId: string, accountId: string, amount: number) =>
    api.post<CopyAllocation>('/social/copy', {}, {
      params: { master_id: masterId, account_id: accountId, amount },
    }),
  stopCopy: (id: string) => api.delete<{ message: string; returned_to_wallet?: number }>(`/social/copy/${id}`),
  /** Withdraw from a PAMM/MAM-typed subscription. */
  withdrawManaged: (id: string) =>
    api.delete<{ returned_to_wallet?: number }>(`/social/mamm-pamm/${id}/withdraw`),
  /** Top-up an existing PAMM/MAM allocation. */
  investManaged: (id: string, accountId: string, amount: number) =>
    api.post<{ top_up?: number }>(`/social/mamm-pamm/${id}/invest`, {}, {
      params: { account_id: accountId, amount },
    }),
  /** Provider application / dashboard. master_type defaults to signal_provider. */
  myProvider: (masterType?: string) =>
    api.get<ProviderApplication>('/social/my-provider', masterType ? { master_type: masterType } : undefined),
  becomeProvider: (params: BecomeProviderParams) =>
    api.post<{ account_number?: string }>(
      '/social/become-provider',
      params.strategy_info && Object.keys(params.strategy_info).length > 0 ? params.strategy_info : null,
      {
        params: {
          master_type: params.master_type ?? 'signal_provider',
          performance_fee_pct: params.performance_fee_pct,
          ...(params.management_fee_pct != null ? { management_fee_pct: params.management_fee_pct } : {}),
          min_investment: params.min_investment,
          max_investors: params.max_investors,
          ...(params.description ? { description: params.description } : {}),
        },
      },
    ),
  myFollowers: () => api.get<{ followers?: Follower[] }>('/followers/my-followers'),
  /** PAMM/MAM manager performance dashboard (approved managers only). */
  masterPerformance: () => api.get<MasterPerformance>('/social/master-performance'),
  /** Investor roster for an approved PAMM/MAM manager. */
  masterInvestors: () =>
    api.get<{ investors?: MasterInvestor[] } | MasterInvestor[]>('/social/master-investors'),
};

// ─── Wallet (balance for refill / copy modals) ────────────────────────
export interface WalletSummary {
  main_wallet_balance?: number;
}
export const walletApi = {
  summary: () => api.get<WalletSummary>('/wallet/summary'),
};

// ─── PAMM / MAM ───────────────────────────────────────────────────────
export interface MammPammAccount {
  id: string;
  manager_name: string;
  master_type: string;
  total_return_pct: number;
  // Admin-set risk caps (Mig 0066). Read-only for the trader; shown on the
  // invest modal so investors see the broker-imposed safeguards.
  max_drawdown_pct: number;
  max_loss_per_trade_pct?: number | null;
  performance_fee_pct: number;
  // Backend returns these but the old type missed them — needed for the
  // invest-modal fee stack.
  management_fee_pct?: number;
  admin_commission_pct?: number;
  // When false, the trader UI hides the auto-insure opt-in.
  insurance_enabled?: boolean;
  min_investment: number;
  active_investors: number;
  slots_available: number;
  description: string;
}
export interface MyAllocation {
  id: string;
  master_id: string;
  manager_name: string;
  master_type: string;
  allocation_amount: number;
  current_value: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_pnl: number;
  pnl_pct: number;
  performance_fee_pct: number;
  management_fee_pct?: number;
  admin_commission_pct?: number;
  // Decomposed perf-fee stack — what the master keeps vs what the broker takes.
  master_share_pct?: number;
  admin_share_pct?: number;
  // Estimated fees the investor has paid so far on realised gains.
  fees_paid_estimate?: number;
  // Slice of allocation_amount funded from bonus credit — forfeited on withdraw.
  bonus_portion?: number;
  joined_at: string;
  status: string;
}
export interface AllocationSummary {
  total_invested: number;
  total_current_value: number;
  total_pnl: number;
  overall_pnl_pct: number;
}

/** Admin-tunable PAMM platform policy — drives the deposit-window banner
 *  and the become-manager commission cap hint. All fields informational. */
export interface PammConfig {
  dep_window_start_day: number;
  dep_window_end_day: number;
  trade_window_start_day: number;
  trade_window_end_day: number;
  monthly_profit_fee_pct: number;
  annual_maintenance_pct: number;
  manager_min_deposit_usd: number;
  application_fee_usd: number;
  max_manager_commission_pct: number;
  exclude_bonus_funds: boolean;
}

export interface PammTrade {
  id: string;
  symbol: string;
  side: string;
  lots: number;
  open_price: number;
  close_price?: number | null;
  master_pnl: number;
  your_share: number;
  status: string;
  opened_at?: string;
  closed_at?: string;
}
export interface PammTrades {
  open_trades: PammTrade[];
  closed_trades: PammTrade[];
  your_ratio_pct: number;
}

/** Extra query params for MAM (mamm) invest. Mutually exclusive on the web:
 *  pass volumeScalingPct (1–500) OR lotMultiplier (0.01–100). */
export interface PammInvestOpts {
  volumeScalingPct?: number;
  lotMultiplier?: number;
}

export const pammApi = {
  list: () => api.get<{ items: MammPammAccount[] } | MammPammAccount[]>('/social/mamm-pamm'),
  myAllocations: () =>
    api.get<{ items: MyAllocation[]; summary?: AllocationSummary }>('/social/my-allocations'),
  invest: (id: string, accountId: string, amount: number, opts?: PammInvestOpts) =>
    api.post<{ top_up?: number }>(`/social/mamm-pamm/${id}/invest`, {}, {
      params: {
        account_id: accountId,
        amount,
        ...(opts?.volumeScalingPct != null ? { volume_scaling_pct: opts.volumeScalingPct } : {}),
        ...(opts?.lotMultiplier != null ? { lot_multiplier: opts.lotMultiplier } : {}),
      },
    }),
  withdraw: (id: string) =>
    api.delete<{ returned_to_wallet?: number }>(`/social/mamm-pamm/${id}/withdraw`),
  /** PAMM platform policy (deposit window + fees). Informational; may 404. */
  config: () => api.get<PammConfig>('/social/pamm/config'),
  /** Master trades for a PAMM allocation, with the investor's pool ratio. */
  trades: (allocationId: string) =>
    api.get<PammTrades>(`/social/pamm/${allocationId}/trades`),
};

// ─── Referral / IB ────────────────────────────────────────────────────
export interface BusinessSnapshot {
  is_ib: boolean;
  referral_code?: string | null;
  total_referrals: number;
  active_referrals: number;
  commissions_pending: number;
  commissions_paid: number;
  tier_name?: string | null;
  next_tier_at?: number | null;
}

export const businessApi = {
  snapshot: () => api.get<BusinessSnapshot>('/business/dashboard'),
};

// ─── Referral program (standalone, separate from IB) ──────────────────
export interface ReferralDashboard {
  referral_code: string | null;
  referrals: number;
  qualified_referrals?: number;
  pending_referrals?: number;
  total_earned: number;
  required_trades?: number;
  requires_kyc?: boolean;
  requires_funded_account?: boolean;
}

export type ReferralRowStatus = 'pending' | 'claimable' | 'claimed';
export interface ReferralRow {
  user_id: string;
  name: string | null;
  email: string;
  trades: number;
  status: ReferralRowStatus;
  pending_reason: string | null;
  qualified_at: string | null;
  claimed_at: string | null;
}

export interface ReferralListResponse {
  items: ReferralRow[];
  commission_balance: number;
  next_bounty: number;
  required_trades: number;
  requires_kyc: boolean;
  requires_funded: boolean;
}

export const referralApi = {
  /** Header + stat cards. */
  dashboard: () => api.get<ReferralDashboard>('/business/referral/me'),
  /** Friend rows + commission balance + gate config. */
  list: () => api.get<ReferralListResponse>('/business/referral/list'),
  /** Claim one qualified referral's bounty into the commission balance. */
  claim: (referredUserId: string) =>
    api.post<{ amount: number; status: 'claimed' }>(`/business/referral/claim/${referredUserId}`, {}),
  /** Move the commission balance into the main wallet. */
  withdraw: () =>
    api.post<{ amount: number; status: 'withdrawn' }>('/business/referral/withdraw', {}),
};
