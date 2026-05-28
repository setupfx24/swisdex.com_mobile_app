// Phase-12 typed wrappers for the Earn + Social surface. Grouped in one
// file because each domain's mobile read is small — separate files would
// add ceremony without payoff. If any of these grow (e.g. PAMM invest
// flow) split them out then.

import api from './client';

// ─── Rewards ─────────────────────────────────────────────────────────
export interface RewardsState {
  xp: number;
  artha_coins: number;
  power_score: number;
  streak_days: number;
  streak_bonus_eligible_at_days: number;
}
export interface Mission {
  id: string;
  type: 'daily' | 'weekly' | 'bonus' | 'flash' | 'achievement' | string;
  title: string;
  description?: string;
  progress: number;
  goal: number;
  reward_xp?: number;
  reward_coins?: number;
  claimed: boolean;
  expires_at?: string | null;
}

export const rewardsApi = {
  state: () => api.get<RewardsState>('/rewards/state'),
  missions: () => api.get<Mission[]>('/rewards/missions'),
  claim: (id: string) => api.post<{ message: string }>(`/rewards/missions/${id}/claim`, {}),
  checkIn: () => api.post<{ message: string; streak_days: number }>('/rewards/streak/check-in', {}),
};

// ─── Staking ─────────────────────────────────────────────────────────
export interface StakingPlan {
  id: string;
  label: string;
  tenure_days: number;
  apy_pct: number;
  min_amount: number;
  max_amount: number;
  is_active: boolean;
}
export interface StakingPosition {
  id: string;
  plan_id: string;
  principal: number;
  rewards_earned: number;
  status: 'active' | 'matured' | 'withdrawn';
  opened_at: string;
  matures_at: string;
}

export const stakingApi = {
  plans: () => api.get<StakingPlan[]>('/staking/plans'),
  positions: () => api.get<StakingPosition[]>('/staking/positions'),
};

// ─── Fixed Return ────────────────────────────────────────────────────
export interface FixedReturnTier {
  tenure_label: string;
  tenure_days: number;
  rate_pct: number;
}
export interface FixedReturnConfig {
  tiers: FixedReturnTier[];
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
}

export const fixedReturnApi = {
  config: () => api.get<FixedReturnConfig>('/fixed-return/config'),
  locks: () => api.get<FixedReturnLock[]>('/fixed-return/locks'),
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

/** Map a backend settled_reason code to a user-facing sentence. */
export function insuranceReasonLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    min_duration: 'Position closed before the minimum insured holding time.',
    daily_claim_limit: 'Daily claim limit for your account was reached.',
    not_a_loss: 'Position closed in profit — no loss to cover.',
    hedge: 'Position was hedged, which voids coverage.',
    policy_expired: 'Coverage window elapsed before the position closed.',
    max_cap_zero: 'Policy cap was zero — nothing to cover.',
    manual_review: 'Declined after manual review.',
  };
  return map[code] ?? code.replace(/_/g, ' ');
}

export const insuranceApi = {
  active: () => api.get<InsurancePolicy[]>('/insurance/active'),
  policies: () => api.get<InsurancePolicy[]>('/insurance/policies'),
  claims: () => api.get<{ id: string; policy_id: string; payout: number; created_at: string }[]>('/insurance/claims'),
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

export const socialApi = {
  leaderboard: () =>
    api.get<{ items: LeaderboardEntry[] } | LeaderboardEntry[]>('/social/leaderboard'),
  myCopies: () => api.get<CopyAllocation[]>('/social/my-copies'),
  startCopy: (masterId: string, amount: number) =>
    api.post<CopyAllocation>('/social/copy', { master_user_id: masterId, amount }),
  stopCopy: (id: string) => api.delete<{ message: string }>(`/social/copy/${id}`),
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
