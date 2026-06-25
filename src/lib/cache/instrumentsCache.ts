// Persistent on-disk cache of the instrument list. Once /instruments has
// loaded successfully even once, we keep a copy at <documentDir>/instruments.json
// so the Markets / Instruments screens are NEVER empty on later launches —
// even if a cold-start fetch hiccups (the "no instruments in the APK" symptom).
import { File, Paths } from 'expo-file-system';
import type { InstrumentInfo } from '@/types/market';

const FILE = 'instruments.json';

function cacheFile(): File {
  return new File(Paths.document, FILE);
}

/** Last known instrument list, or null on first run / any read error. */
export function loadCachedInstruments(): InstrumentInfo[] | null {
  try {
    const file = cacheFile();
    if (!file.exists) return null;
    const parsed: unknown = JSON.parse(file.textSync());
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as InstrumentInfo[]) : null;
  } catch {
    return null;
  }
}

/** Persist a freshly-fetched instrument list (best-effort, errors swallowed). */
export function saveCachedInstruments(list: InstrumentInfo[]): void {
  try {
    if (!Array.isArray(list) || list.length === 0) return;
    cacheFile().write(JSON.stringify(list));
  } catch {
    /* losing the cache just means re-fetching next session */
  }
}
