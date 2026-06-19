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
  // The gateway may return a bare array OR a { items: [...] } envelope
  // (same as the web accounts page handles). Always normalise to an array so
  // the store sees every account, not a broken object.
  list: async (): Promise<TradingAccount[]> => {
    const res = await api.get<TradingAccount[] | { items?: TradingAccount[] }>('/accounts');
    return Array.isArray(res) ? res : (res?.items ?? []);
  },
  get: (id: string) => api.get<TradingAccount>(`/accounts/${id}`),
  summary: (id: string) => api.get<AccountSummary>(`/accounts/${id}/summary`),
  /** Demo pool is a different set of groups — fetched with ?is_demo=true,
   *  mirroring the web AccountTypePickerModal. */
  availableGroups: (isDemo?: boolean) =>
    api.get<{ items: AvailableAccountGroup[] } | AvailableAccountGroup[]>(
      '/accounts/available-groups',
      isDemo ? { is_demo: true } : undefined,
    ),
  open: (body: OpenAccountPayload) => api.post<TradingAccount>('/accounts/open', body),
  delete: (id: string) => api.delete<{ message: string }>(`/accounts/${id}`),
  setLeverage: (id: string, leverage: number) =>
    api.patch<{ message: string }>(`/accounts/${id}/leverage`, { leverage }),
};
