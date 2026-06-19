import api from './client';

// Typed thin wrappers over the gateway's IB / business endpoints — paths
// mirror the web trader (frontend/trader/src/app/business/page.tsx). The
// backend returns loosely-typed JSON; we narrow the fields the mobile
// dashboard actually renders and leave the rest optional.

export interface IbEligibility {
  min_deposit_required_usd: number;
  total_deposits_usd: number;
  is_eligible: boolean;
}

export interface BusinessStatus {
  is_ib: boolean;
  application_status?: 'none' | 'pending' | 'approved' | 'rejected' | string | null;
  eligibility?: IbEligibility | null;
  referral_code?: string | null;
  level?: number | null;
  is_sub_broker?: boolean;
  sub_broker_status?: 'none' | 'pending' | 'approved' | 'rejected' | string | null;
}

export interface IbTier {
  label?: string;
  per_lot?: number;
  per_lot_by_account_type?: Record<string, number> | null;
}

export interface IbEarningByUser {
  user_id?: string;
  name?: string | null;
  email?: string | null;
  total_commission?: number;
  trades_attributed?: number;
}

export interface IbDashboard {
  /** Broker class: full IB, a sub-IB under another IB, or a super IB. */
  ib_type?: 'super_ib' | 'ib' | 'sub_ib' | string;
  is_sub_ib?: boolean;
  /** When true, the trader can ask SwisDex to upgrade them to a full IB. */
  can_request_ib_upgrade?: boolean;
  total_earned?: number;
  pending_payout?: number;
  total_referrals?: number;
  level?: number;
  commission_balance?: number;
  referral_code?: string | null;
  referral_link?: string | null;
  tier?: IbTier | null;
  next_tier?: { label?: string; per_lot?: number } | null;
  activations?: number;
  referral_deposit_total?: number;
  needed_activations_for_next?: number;
  needed_amount_for_next?: number;
  earnings_by_user?: IbEarningByUser[];
}

export interface IbReferral {
  id: string;
  name?: string | null;
  email?: string | null;
  status?: string | null;
  total_deposit?: number;
  created_at?: string | null;
  referred_user?: { name?: string | null; email?: string | null; joined_at?: string | null } | null;
}

export interface IbCommission {
  id: string;
  source_user?: { name?: string | null; email?: string | null } | null;
  commission_type?: string | null;
  mlm_level?: number | null;
  amount?: number;
  status?: string | null;
  created_at?: string | null;
}

export interface SubBrokerClient {
  user_id: string;
  email?: string | null;
  name?: string | null;
  status?: string | null;
  kyc_status?: string | null;
  accounts_count?: number;
  total_balance?: number;
  joined_at?: string | null;
}

export interface SubBrokerDashboard {
  referral_code?: string | null;
  direct_clients?: number;
  total_commission?: number;
  pending_payout?: number;
  total_earned?: number;
  clients?: SubBrokerClient[];
}

export interface TreeNode {
  id: string;
  user_id?: string;
  email?: string | null;
  name?: string | null;
  referral_code?: string | null;
  level?: number;
  depth?: number;
  total_earned?: number;
  is_active?: boolean;
  children?: TreeNode[];
}

export interface IbTree {
  root?: { id?: string; referral_code?: string; level?: number; total_earned?: number } | null;
  tree?: TreeNode[];
  total_nodes?: number;
}

interface ListEnvelope<T> {
  items?: T[];
}

export const businessApi = {
  status: () => api.get<BusinessStatus>('/business/status'),
  ibDashboard: () => api.get<IbDashboard>('/business/ib/dashboard'),
  ibReferrals: () => api.get<ListEnvelope<IbReferral>>('/business/ib/referrals'),
  ibCommissions: () => api.get<ListEnvelope<IbCommission>>('/business/ib/commissions'),
  ibTree: () => api.get<IbTree>('/business/ib/tree', { max_depth: 5 }),

  apply: () => api.post<{ message?: string }>('/business/apply', {}),
  /** Sweep the IB commission balance into the main wallet. */
  ibTransfer: () => api.post<{ transferred: number }>('/business/ib/transfer', {}),

  applySubBroker: (companyName?: string) =>
    api.post<{ message?: string }>('/business/apply-sub-broker', companyName ? { company_name: companyName } : {}),
  subBrokerDashboard: () => api.get<SubBrokerDashboard>('/business/sub-broker/dashboard'),
};
