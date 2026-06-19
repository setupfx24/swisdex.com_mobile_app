import api from './client';
import type { SupportTicket, SupportMessage } from '@/types/notifications';

interface TicketListResponse {
  items: SupportTicket[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export const supportApi = {
  // Backend returns a paginated envelope { items, total, ... } — unwrap to an
  // array (tolerate a bare array too, in case the shape ever changes).
  listTickets: async (): Promise<SupportTicket[]> => {
    const r = await api.get<TicketListResponse | SupportTicket[]>('/support/tickets');
    return Array.isArray(r) ? r : r?.items ?? [];
  },
  getTicket: (id: string) =>
    api.get<SupportTicket & { messages: SupportMessage[] }>(`/support/tickets/${id}`),
  createTicket: (body: { subject: string; message: string; priority?: string }) =>
    api.post<SupportTicket>('/support/tickets', body),
  reply: (id: string, message: string) =>
    api.post<SupportMessage>(`/support/tickets/${id}/reply`, { message }),
};
