import api from './client';
import type {
  Deposit, Withdrawal, WalletTransaction,
  DepositMethod, WithdrawalMethod,
} from '@/types/wallet';

export interface CreateDepositPayload {
  account_id?: string;
  amount: number;
  method: DepositMethod;
  transaction_id?: string;
  crypto_currency?: string;
  /** Promo / bonus code (optional). */
  promo_code?: string;
}

export interface CreateWithdrawalPayload {
  amount: number;
  method: WithdrawalMethod;
  bank_details?: Record<string, string>;
  crypto_address?: string;
  account_id?: string;
}

export interface TransferPayload {
  amount: number;
  account_id?: string;       // destination for main→trading; source for trading→main
  from_account_id?: string;  // internal transfers
  to_account_id?: string;
}

export interface WalletLiveAccount {
  id: string;
  account_number: string;
  balance: number;
  credit?: number;
  margin_used?: number;
  free_margin?: number;
  currency?: string;
}

export interface WalletSummary {
  main_wallet_balance?: number;
  main_wallet_bonus?: number;
  /** ISO timestamp — set once the user has forfeited bonus on a withdrawal. */
  bonus_forfeited_at?: string | null;
  total_deposited?: number;
  total_withdrawn?: number;
  total_live_balance?: number;
  live_accounts?: WalletLiveAccount[];
}

/** Which deposit/withdraw rails the admin has enabled. */
export interface PaymentMethods {
  crypto?: boolean;
  manual?: boolean;
  p2p?: boolean;
}

export interface BankDetails {
  bank_name?: string;
  account_holder?: string;
  account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
  qr_code_url?: string;
}

export interface BonusOverview {
  active_offers?: {
    id: string; name: string; bonus_type?: string | null;
    percentage?: number | null; fixed_amount?: number | null;
    min_deposit?: number; max_bonus?: number | null;
    lots_required?: number; expires_at?: string | null;
  }[];
  my_bonuses?: {
    id: string; offer_name?: string | null; amount: number;
    lots_traded?: number; lots_required?: number; status: string;
    released_at?: string | null; expires_at?: string | null; created_at?: string | null;
  }[];
  recent_requests?: {
    deposit_id: string; deposit_amount: number; bonus_code: string;
    bonus_status?: 'pending' | 'granted' | 'denied' | null;
    bonus_amount?: number | null; created_at?: string | null;
  }[];
}

export const walletApi = {
  // Deposits — gateway routes are mounted under /wallet/* (see main.py:142).
  createDeposit: (body: CreateDepositPayload) => api.post<Deposit>('/wallet/deposit', body),
  createManualDeposit: (body: CreateDepositPayload) => api.post<Deposit>('/wallet/deposit/manual', body),
  createWalletDeposit: (body: CreateDepositPayload) => api.post<Deposit>('/wallet/deposit/wallet', body),
  depositStatus: (id: string) => api.get<Deposit>(`/wallet/deposit/${id}/status`),
  listDeposits: () => api.get<Deposit[]>('/wallet/deposits'),

  // Withdrawals.
  createWithdrawal: (body: CreateWithdrawalPayload) => api.post<Withdrawal>('/wallet/withdraw', body),
  createManualWithdrawal: (body: CreateWithdrawalPayload) => api.post<Withdrawal>('/wallet/withdraw/manual', body),
  listWithdrawals: () => api.get<Withdrawal[]>('/wallet/withdrawals'),

  // Transfers.
  mainToTrading: (body: TransferPayload) => api.post<{ message: string }>('/wallet/transfer-main-to-trading', body),
  tradingToMain: (body: TransferPayload) => api.post<{ message: string }>('/wallet/transfer-trading-to-main', body),
  internal: (body: TransferPayload) => api.post<{ message: string }>('/wallet/transfer-internal', body),

  // Balances, bonus + funding config (mirrors the web wallet page).
  summary: () => api.get<WalletSummary>('/wallet/summary'),
  paymentMethods: () => api.get<PaymentMethods>('/wallet/payment-methods'),
  bankDetails: (amount?: number) =>
    api.post<BankDetails>('/wallet/deposit/bank-details', amount ? { amount } : {}),
  bonusOverview: () => api.get<BonusOverview>('/wallet/bonus/overview'),

  /** "Request to RM" — emails the relationship manager to coordinate a
   *  manual deposit/withdrawal. Gated by the admin `p2p` payment flag. */
  rmRequest: (body: { amount: number; phone: string; side: 'deposit' | 'withdraw'; payout_details?: string; note?: string }) =>
    api.post<{ status: string; message: string }>('/wallet/deposit/rm-request', body),

  // Unified ledger.
  transactions: (params?: { page?: number; per_page?: number }) => {
    const q: Record<string, string | number> = {};
    if (params?.page != null) q.page = params.page;
    if (params?.per_page != null) q.per_page = params.per_page;
    return api.get<{ items: WalletTransaction[]; total: number; page: number; per_page: number; pages: number }>(
      '/wallet/transactions',
      q as Record<string, string | number | boolean | null | undefined>,
    );
  },
};
