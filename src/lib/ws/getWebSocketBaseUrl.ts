import { apiConfig } from '@/lib/api/config';

/** Resolve the WebSocket origin (scheme + host, no path).
 *  Preference order:
 *    1) EXPO_PUBLIC_WS_BASE — explicit override, used in production.
 *    2) Derived from EXPO_PUBLIC_API_BASE: http→ws, https→wss, same host.
 *    3) ws://localhost:8000 fallback (dev only). */
export function getWebSocketBaseUrl(): string {
  if (apiConfig.wsBase && apiConfig.wsBase !== 'ws://localhost:8000') {
    return apiConfig.wsBase;
  }
  try {
    const u = new URL(apiConfig.apiBase);
    const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${u.host}`;
  } catch {
    return 'ws://localhost:8000';
  }
}
