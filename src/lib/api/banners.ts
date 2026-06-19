import api from './client';
import type { Banner } from '@/types/notifications';

export const bannersApi = {
  /** All active banners. Optionally scoped to a page (web calls
   *  GET /banners?page=dashboard for the home surface). */
  list: (page?: string) =>
    api.get<Banner[] | { items?: Banner[]; banners?: Banner[] }>(
      '/banners',
      page ? { page } : undefined,
    ),
};
