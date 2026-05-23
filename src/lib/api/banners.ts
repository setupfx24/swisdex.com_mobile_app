import api from './client';
import type { Banner } from '@/types/notifications';

export const bannersApi = {
  list: () => api.get<Banner[]>('/banners'),
};
