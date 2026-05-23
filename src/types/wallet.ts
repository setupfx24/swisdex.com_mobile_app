export type DepositMethod = 'bank' | 'upi' | 'crypto_nowpayments' | 'crypto_oxapay' | 'card';
export type WithdrawalMethod = 'bank' | 'upi' | 'crypto_oxapay';
export type DepositStatus = 'pending' | 'approved' | 'rejected';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type TransactionType = 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'commission' | 'swap' | 'bonus' | 'adjustment';

export interface Deposit {
  id: string;
  amount: number;
  currency: string;
  method: DepositMethod;
  status: DepositStatus;
  transaction_id?: string | null;
  created_at: string;
  pay_address?: string | null;
  pay_amount?: string | null;
  pay_currency?: string | null;
  network?: string | null;
  expires_at?: string | null;
  invoice_url?: string | null;
}

export interface Withdrawal {
  id: string;
  amount: number;
  currency: string;
  method: WithdrawalMethod;
  status: WithdrawalStatus;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description?: string | null;
  status: string;
  created_at: string;
}
