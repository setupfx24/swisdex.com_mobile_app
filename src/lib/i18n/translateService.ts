// Free, key-less translation via Google's public `translate_a/single` endpoint
// (client=gtx) — the same engine the web app's Google Translate widget uses.
// No billing, no API key. We lean on aggressive caching + concurrency limiting
// (see i18nStore) so the unofficial endpoint isn't hammered.

const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const TIMEOUT_MS = 8000;

// The response shape is `[[["translated","source",...], ...], ...]`. We can't
// trust the structure, so every index access is guarded (noUncheckedIndexedAccess).
function parseResponse(json: unknown): string | null {
  if (!Array.isArray(json)) return null;
  const segments = json[0];
  if (!Array.isArray(segments)) return null;
  let out = '';
  for (const seg of segments) {
    if (Array.isArray(seg) && typeof seg[0] === 'string') out += seg[0];
  }
  return out.length > 0 ? out : null;
}

/**
 * Translate `text` into `targetLang` (ISO code, e.g. 'es', 'ar', 'zh').
 * Returns the original text on ANY failure (network down, rate-limit, parse
 * error, timeout) so the UI degrades gracefully to English rather than breaking.
 */
export async function translateText(text: string, targetLang: string): Promise<string> {
  const url =
    `${ENDPOINT}?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}` +
    `&dt=t&q=${encodeURIComponent(text)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return text;
    const json: unknown = await res.json();
    return parseResponse(json) ?? text;
  } catch {
    return text;
  } finally {
    clearTimeout(timer);
  }
}
