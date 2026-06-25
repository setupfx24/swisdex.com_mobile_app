import { useCallback, useEffect } from 'react';
import { useI18nStore } from '@/stores/i18nStore';
import { translateText } from './translateService';
import { shouldSkip } from './skip';

export { useI18nStore };

/**
 * Translate a single source string into the active language. Returns English
 * immediately on a cache miss and fills in the translation when it resolves —
 * only the component rendering THIS string re-renders (keyed Zustand selector).
 */
export function useTranslated(source: string): string {
  const lang = useI18nStore((s) => s.lang);
  const key = `${lang}:${source}`;
  const hit = useI18nStore((s) => s.cache[key]);
  const skip = lang === 'en' || source.length === 0 || shouldSkip(source);

  useEffect(() => {
    if (!skip && hit === undefined) useI18nStore.getState().enqueue(source);
  }, [key, skip, hit, source]);

  if (skip) return source;
  return hit ?? source;
}

/**
 * Returns a translate fn for string PROPS that don't pass through <Text>
 * (TextInput placeholder, native tab titles). Subscribes the caller to the
 * cache so those props update as translations arrive.
 */
export function useT(): (s: string) => string {
  const lang = useI18nStore((s) => s.lang);
  const cache = useI18nStore((s) => s.cache);
  return useCallback(
    (src: string) => {
      if (lang === 'en' || src.length === 0 || shouldSkip(src)) return src;
      const key = `${lang}:${src}`;
      const hit = cache[key];
      if (hit === undefined) useI18nStore.getState().enqueue(src);
      return hit ?? src;
    },
    [lang, cache],
  );
}

/**
 * Imperative one-shot translation for non-React call sites (e.g. Alert.alert).
 * Awaits the network when uncached; caches the result for the UI too.
 */
export async function t(source: string): Promise<string> {
  const { lang, cache } = useI18nStore.getState();
  if (lang === 'en' || source.length === 0 || shouldSkip(source)) return source;
  const key = `${lang}:${source}`;
  const hit = cache[key];
  if (hit !== undefined) return hit;
  const tr = await translateText(source, lang);
  useI18nStore.setState((s) => ({ cache: { ...s.cache, [key]: tr } }));
  return tr;
}
