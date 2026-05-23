import api from './client';
import type { OrderResponse, PlaceOrderPayload, OrderStatus } from '@/types/trading';

export const ordersApi = {
  place: (body: PlaceOrderPayload) =>
    api.post<OrderResponse>('/orders/', body),

  list: (accountId: string, status?: OrderStatus) =>
    api.get<OrderResponse[]>('/orders/', {
      account_id: accountId,
      ...(status ? { status } : {}),
    }),

  modify: (
    id: string,
    body: { price?: number; stop_loss?: number | null; take_profit?: number | null; lots?: number },
  ) => api.put<OrderResponse>(`/orders/${id}`, body),

  cancel: (id: string) => api.delete<{ message: string }>(`/orders/${id}`),
};
