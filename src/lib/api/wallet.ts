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
