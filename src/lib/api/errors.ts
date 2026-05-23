// Typed error classes for the API layer. Callers can narrow on `instanceof`
// to render appropriate UI — e.g. ApiAuthError should boot the user to the
// login screen, ApiNetworkError should show "Gateway unreachable", and a
// plain ApiError should surface the server's detail message.

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly path: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** 401 from the gateway after a refresh attempt has already failed.
 *  Throwing this signals "tokens are gone, redirect to login". */
export class ApiAuthError extends ApiError {
  constructor(message: string, path: string, detail?: unknown) {
    super(message, 401, path, detail);
    this.name = 'ApiAuthError';
  }
}

/** The fetch itself failed (DNS, timeout, TLS, connection refused). The
 *  most common cause in dev is "gateway not started" — surface a clear
 *  message rather than letting the underlying TypeError leak. */
export class ApiNetworkError extends Error {
  constructor(message: string, public readonly path: string, public override readonly cause?: unknown) {
    super(message);
    this.name = 'ApiNetworkError';
  }
}

/** Request was aborted by the caller (component unmount, search debounce,
 *  user backed out). Distinct so UI can swallow it silently rather than
 *  treating a navigation cleanup as a real error. */
export class ApiCancelledError extends Error {
  constructor() {
    super('Request cancelled');
    this.name = 'ApiCancelledError';
  }
}

/** Best-effort extraction of a human-readable error string from a FastAPI
 *  error envelope. FastAPI returns either {detail: "string"} or
 *  {detail: [{msg, loc, …}]} for validation errors. */
export function formatApiDetail(detail: unknown, fallback: string): string {
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((d) => (typeof d === 'object' && d != null && 'msg' in d ? String((d as { msg: unknown }).msg) : ''))
      .filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
  }
  return fallback;
}
