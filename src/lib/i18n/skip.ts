// Strings we must NEVER send to the translator — numbers, prices, instrument
// symbols, account ids, punctuation. Translating these wastes free-tier calls
// and can corrupt data (e.g. "EURUSD" → garbage, "$1,234.50" digits reordered).

// Any Latin / accented-Latin letter. If a string has none, it's a number,
// price, symbol or punctuation — nothing to translate.
const HAS_LETTER = /[A-Za-zÀ-ɏ]/;

// Instrument tickers: EURUSD, XAUUSD, US30, NAS100, BTCUSD, AAPL.US …
const SYMBOL = /^[A-Z0-9]{2,10}([./][A-Z0-9]{1,6})?$/;

/** True → render the source text as-is (skip translation). */
export function shouldSkip(text: string): boolean {
  const t = text.trim();
  if (t.length === 0) return true;
  if (!HAS_LETTER.test(t)) return true; // numbers, prices, "—", "+1.23%", etc.
  if (SYMBOL.test(t)) return true; // ALL-CAPS tickers / account codes
  return false;
}
