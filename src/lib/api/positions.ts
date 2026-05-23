import api from './client';
import type {
  Position,
  ModifyPositionPayload,
  ClosePositionPayload,
  BulkClosePayload,
  PositionStatus,
} from '@/types/trading';

export const positionsApi = {
  list: (accountId: string, status: PositionStatus = 'open') =>
    api.get<Position[]>('/positions/', { account_id: accountId, status }),

  modify: (id: string, body: ModifyPositionPayload) =>
    api.put<Position>(`/positions/${id}`, body),

  close: (id: string, body: ClosePositionPayload = {}) =>
    api.post<{ message: string }>(`/positions/${id}/close`, body),

  closeAll: (body: BulkClosePayload) =>
    api.post<{ closed: number; failed: number }>('/positions/close-all', body),
};
