import api from './client';
import type { AppNotification } from '@/types/notifications';

export const notificationsApi = {
  list: (params: { unread_only?: boolean; page?: number; per_page?: number } = {}) => {
    const q: Record<string, string | number | boolean> = {};
    if (params.unread_only) q.unread_only = true;
    if (params.page != null) q.page = params.page;
    if (params.per_page != null) q.per_page = params.per_page;
    return api.get<{ items: AppNotification[]; total: number; page: number; per_page: number; pages: number } | AppNotification[]>(
      '/notifications/',
      q,
    );
  },
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.put<{ message: string }>(`/notifications/${id}/read`),
  markAllRead: () => api.put<{ message: string }>('/notifications/read-all'),
};
