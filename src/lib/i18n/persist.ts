// Per-language translation cache on disk. One JSON file per language under
// <documentDir>/i18n/<lang>.json — { [sourceText]: translatedText }.
// SecureStore (~2KB/key on Android) is too small; expo-file-system has no cap
// and lets us load only the active language.
import { File, Directory, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

const DIR = 'i18n';
export const LANG_KEY = 'swisdex.lang';

function langFile(lang: string): File {
  return new File(Paths.document, DIR, `${lang}.json`);
}

/** Load a language's cached translations. {} on first run / any error. */
export function loadCacheFile(lang: string): Record<string, string> {
  try {
    const file = langFile(lang);
    if (!file.exists) return {};
    const raw = file.textSync();
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, string>;
    return {};
  } catch {
    return {};
  }
}

/** Persist a language's translation map (full overwrite). Errors swallowed. */
export function saveCacheFile(lang: string, map: Record<string, string>): void {
  try {
    const dir = new Directory(Paths.document, DIR);
    if (!dir.exists) dir.create({ intermediates: true });
    langFile(lang).write(JSON.stringify(map));
  } catch {
    /* best-effort cache — losing it just means re-fetching next session */
  }
}

/** Persisted language code (survives restarts). */
export async function loadLang(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(LANG_KEY);
  } catch {
    return null;
  }
}

export async function saveLang(lang: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}
