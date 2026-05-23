import api from './client';
import { apiConfig } from './config';
import { loadTokens } from '@/lib/storage/tokens';
import { ApiError, ApiNetworkError, formatApiDetail } from './errors';
import type { User } from '@/types/auth';
import type { Session } from '@/types/accounts';

export interface ProfileUpdatePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  country?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  language?: string;
  theme?: string;
}

export interface KycSubmitPayload {
  /** File picker / image picker result. uri must be the local file:// path
   *  RN gives us; name + mimeType drive the multipart envelope. */
  document_type: 'passport' | 'national_id' | 'drivers_license' | 'utility_bill' | 'bank_statement';
  file: { uri: string; name: string; mimeType: string };
  residential_address?: string;
  city?: string;
  postal_code?: string;
  country_of_residence?: string;
}

export const profileApi = {
  get: () => api.get<User>('/profile'),
  update: (body: ProfileUpdatePayload) => api.put<User>('/profile', body),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<{ message: string }>('/profile/password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),

  listSessions: () => api.get<Session[]>('/profile/sessions'),
  revokeSession: (id: string) => api.delete<{ message: string }>(`/profile/sessions/${id}`),

  /** Multipart upload — sidesteps the JSON client. Reuses Bearer auth from
   *  SecureStore. Throws ApiError on non-2xx (formatApiDetail handles
   *  FastAPI's detail envelope). */
  submitKyc: async (body: KycSubmitPayload): Promise<{ status: string; message: string }> => {
    const form = new FormData();
    form.append('document_type', body.document_type);
    // RN's typed FormData differs from web's — cast through unknown to
    // keep TS happy without touching the runtime shape.
    form.append('file', {
      uri: body.file.uri,
      name: body.file.name,
      type: body.file.mimeType,
    } as unknown as Blob);
    if (body.residential_address) form.append('residential_address', body.residential_address);
    if (body.city) form.append('city', body.city);
    if (body.postal_code) form.append('postal_code', body.postal_code);
    if (body.country_of_residence) form.append('country_of_residence', body.country_of_residence);

    const tokens = await loadTokens();
    const headers: Record<string, string> = {};
    if (tokens) headers['Authorization'] = `Bearer ${tokens.access}`;

    let res: Response;
    try {
      res = await fetch(`${apiConfig.apiBase}/profile/kyc/submit`, {
        method: 'POST',
        headers,
        body: form,
      });
    } catch (e) {
      throw new ApiNetworkError(
        'Could not reach the gateway to upload your KYC document.',
        '/profile/kyc/submit',
        e,
      );
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const detail = (errBody as { detail?: unknown }).detail;
      throw new ApiError(formatApiDetail(detail, `HTTP ${res.status}`), res.status, '/profile/kyc/submit', detail);
    }
    return res.json();
  },
};
