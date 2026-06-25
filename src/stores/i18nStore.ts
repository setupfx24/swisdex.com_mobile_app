import { create } from 'zustand';
import { translateText } from '@/lib/i18n/translateService';
import { shouldSkip } from '@/lib/i18n/skip';
import { loadCacheFile, saveCacheFile, loadLang, saveLang } from '@/lib/i18n/persist';

// ── Module-scope work queue (NOT in store state, so it never triggers renders) ──
const MAX_CONCURRENT = 5;
interface QueueItem { source: string; lang: string; key: string }
const queue: QueueItem[] = [];
const queuedKeys = new Set<string>();
const inFlight = new Set<string>();

// In-memory mirror of each language's on-disk map ({ source: translated }),
// used for debounced persistence without re-deriving from the keyed cache.
const loaded: Record<string, Record<string, string>> = {};
const dirty = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  flushTimer = null;
  for (const lang of dirty) saveCacheFile(lang, loaded[lang] ?? {});
  dirty.clear();
}
function markDirty(lang: string) {
  dirty.add(lang);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 1000);
}

interface I18nState {
  /** Active language ISO code. 'en' = source (no translation). */
  lang: string;
  /** True once the persisted language + its cache have been read. */
  hydrated: boolean;
  /** Translation cache keyed `${lang}:${source}` for per-string subscriptions. */
  cache: Record<string, string>;
  hydrate: () => Promise<void>;
  setLang: (code: string) => Promise<void>;
  /** Schedule a string for translation in the current language (deduped). */
  enqueue: (source: string) => void;
}

export const useI18nStore = create<I18nState>((set, get) => {
  // Merge a language's loaded map into the keyed cache (one set() = one render pass).
  const mergeLoaded = (lang: string) => {
    const map = loaded[lang];
    if (!map) return;
    const next = { ...get().cache };
    for (const src of Object.keys(map)) {
      const tr = map[src];
      if (tr !== undefined) next[`${lang}:${src}`] = tr;
    }
    set({ cache: next });
  };

  const apply = (lang: string, source: string, tr: string) => {
    // Cache in-memory always (no repeat fetch this session). Persist only real
    // translations — a failed fetch returns the source unchanged, so we leave
    // it off disk to allow a retry next session.
    set({ cache: { ...get().cache, [`${lang}:${source}`]: tr } });
    if (tr !== source) {
      loaded[lang] = { ...(loaded[lang] ?? {}), [source]: tr };
      markDirty(lang);
    }
  };

  const pump = () => {
    while (inFlight.size < MAX_CONCURRENT && queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      queuedKeys.delete(item.key);
      if (get().cache[item.key] !== undefined) continue; // resolved while queued
      inFlight.add(item.key);
      void translateText(item.source, item.lang)
        .then((tr) => apply(item.lang, item.source, tr))
        .catch(() => {})
        .finally(() => {
          inFlight.delete(item.key);
          pump();
        });
    }
  };

  return {
    lang: 'en',
    hydrated: false,
    cache: {},

    hydrate: async () => {
      try {
        const saved = (await loadLang()) ?? 'en';
        if (saved !== 'en') {
          loaded[saved] = loadCacheFile(saved);
          set({ lang: saved });
          mergeLoaded(saved);
        }
        set({ hydrated: true });
      } catch {
        set({ hydrated: true });
      }
    },

    setLang: async (code) => {
      if (code === get().lang) return;
      await saveLang(code);
      if (code !== 'en' && !loaded[code]) loaded[code] = loadCacheFile(code);
      set({ lang: code });
      if (code !== 'en') mergeLoaded(code);
    },

    enqueue: (source) => {
      const lang = get().lang;
      if (lang === 'en' || shouldSkip(source)) return;
      const key = `${lang}:${source}`;
      if (get().cache[key] !== undefined || inFlight.has(key) || queuedKeys.has(key)) return;
      queuedKeys.add(key);
      queue.push({ source, lang, key });
      pump();
    },
  };
});

// Hydrate once at module load (mirrors themeStore) — the persisted language and
// its cached translations resolve a few ms after boot.
void useI18nStore.getState().hydrate();
