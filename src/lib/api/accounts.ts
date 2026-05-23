import api from './client';
import type {
  TradingAccount,
  AccountSummary,
  AvailableAccountGroup,
} from '@/types/accounts';

export interface OpenAccountPayload {
  account_group_id: string;
  leverage?: number;
  is_demo?: boolean;
}

export const accountsApi = {
  list: () => api.get<TradingAccount[]>('/accounts'),
  get: (id: string) => api.get<TradingAccount>(`/accounts/${id}`),
  summary: (id: string) => api.get<AccountSummary>(`/accounts/${id}/summary`),
  availableGroups: () => api.get<AvailableAccountGroup[]>('/accounts/available-groups'),
  open: (body: OpenAccountPayload) => api.post<TradingAccount>('/accounts/open', body),
  delete: (id: string) => api.delete<{ message: string }>(`/accounts/${id}`),
  setLeverage: (id: string, leverage: number) =>
    api.patch<{ message: string }>(`/accounts/${id}/leverage`, { leverage }),
};
