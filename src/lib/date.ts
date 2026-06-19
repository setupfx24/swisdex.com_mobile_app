import { format } from 'date-fns';

/** Safely format an ISO/date string. Returns '—' for missing or invalid
 *  values instead of throwing — date-fns `format(new Date(bad))` raises a
 *  RangeError that crashes release (APK) screens with no red-box recovery. */
export function safeFormat(value?: string | number | Date | null, pattern = 'MMM d, HH:mm'): string {
  if (value == null || value === '') return '—';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : format(d, pattern);
}
