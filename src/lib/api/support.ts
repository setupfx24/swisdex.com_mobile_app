import api from './client';
import type { SupportTicket, SupportMessage } from '@/types/notifications';

export const supportApi = {
  listTickets: () => api.get<SupportTicket[]>('/support/tickets'),
  getTicket: (id: string) => api.get<SupportTicket & { messages: SupportMessage[] }>(`/support/tickets/${id}`),
  createTicket: (body: { subject: string; category?: string; priority?: string; body: string }) =>
    api.post<SupportTicket>('/support/tickets', body),
  reply: (id: string, body: string) =>
    api.post<SupportMessage>(`/support/tickets/${id}/messages`, { body }),
};
