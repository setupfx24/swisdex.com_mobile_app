import { View, Image } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle, Rect } from 'react-native-svg';
import { Droplet, Flame, Coins } from 'lucide-react-native';
import { Text } from '@/ui';
import { useTheme } from '@/theme';

/** Currency code → ISO-3166 alpha-2 (for flagcdn). EUR uses the EU flag. */
const CCY_TO_ISO: Record<string, string> = {
  USD: 'us', EUR: 'eu', JPY: 'jp', GBP: 'gb', AUD: 'au', NZD: 'nz', CAD: 'ca', CHF: 'ch',
  CNH: 'cn', CNY: 'cn', HKD: 'hk', SGD: 'sg', SEK: 'se', NOK: 'no', DKK: 'dk',
  PLN: 'pl', CZK: 'cz', HUF: 'hu', RON: 'ro', TRY: 'tr', ZAR: 'za', MXN: 'mx',
  BRL: 'br', INR: 'in', RUB: 'ru', KRW: 'kr', TWD: 'tw', THB: 'th', IDR: 'id', PHP: 'ph',
  MYR: 'my', ILS: 'il', AED: 'ae', SAR: 'sa', QAR: 'qa', KWD: 'kw', NGN: 'ng', EGP: 'eg',
};

/** Index ticker (alpha part, digits stripped) → exchange country flag. */
const INDEX_TO_ISO: Record<string, string> = {
  NAS: 'us', US: 'us', SPX: 'us', UST: 'us', USTEC: 'us', WS: 'us', DJ: 'us', NDX: 'us', DOW: 'us', USA: 'us', SP: 'us',
  GER: 'de', DAX: 'de', DE: 'de',
  UK: 'gb', FTSE: 'gb', GB: 'gb',
  FRA: 'fr', FR: 'fr', CAC: 'fr',
  JP: 'jp', JPN: 'jp', NIK: 'jp', NKY: 'jp',
  AUS: 'au', ASX: 'au',
  HK: 'hk', HKG: 'hk', HSI: 'hk',
  EU: 'eu', STOXX: 'eu', ESTX: 'eu', EUSTX: 'eu',
  ESP: 'es', SPA: 'es', IBEX: 'es',
  ITA: 'it', IT: 'it',
  NETH: 'nl', NL: 'nl',
  SWI: 'ch', SMI: 'ch',
  CHINA: 'cn', CN: 'cn', CHN: 'cn',
  IND: 'in', NIFTY: 'in', INDIA: 'in',
};

/** Precious metals (by 3-letter base) → metal-bars icon (light→dark gradient). */
const METALS: Record<string, { light: string; dark: string }> = {
  XAU: { light: '#FFD86B', dark: '#B8860B' }, // gold
  XAG: { light: '#E8EAEC', dark: '#9AA0A6' }, // silver
  XPT: { light: '#D7DDE0', dark: '#8A9398' }, // platinum
  XPD: { light: '#CFC9A8', dark: '#9B8E5E' }, // palladium
};

/** Commodities (by full cleaned ticker) → glyph tile. */
type CommodityGlyph = 'oil' | 'gas' | 'metal';
const COMMODITY: Record<string, { glyph: CommodityGlyph; bg: string }> = {
  USOIL: { glyph: 'oil', bg: '#1A1A1A' }, UKOIL: { glyph: 'oil', bg: '#1A1A1A' },
  WTI: { glyph: 'oil', bg: '#1A1A1A' }, BRENT: { glyph: 'oil', bg: '#1A1A1A' },
  XTIUSD: { glyph: 'oil', bg: '#1A1A1A' }, XBRUSD: { glyph: 'oil', bg: '#1A1A1A' },
  NATGAS: { glyph: 'gas', bg: '#2563EB' }, NGAS: { glyph: 'gas', bg: '#2563EB' }, XNGUSD: { glyph: 'gas', bg: '#2563EB' },
  COPPER: { glyph: 'metal', bg: '#B87333' }, XCUUSD: { glyph: 'metal', bg: '#B87333' },
};

/** Tickers whose base differs from the cryptocurrency-icons code. */
const CRYPTO_ALIAS: Record<string, string> = {
  DOG: 'doge', DOGE: 'doge', LNK: 'link', SHIB: 'shib', MATIC: 'matic', XBT: 'btc',
};

const flagUrl = (iso: string) => `https://flagcdn.com/w80/${iso}.png`;
// Same source the web trader uses (cryptocurrency-icons via jsDelivr) — color PNGs.
const cryptoUrl = (base: string) =>
  `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/${(CRYPTO_ALIAS[base] ?? base).toLowerCase()}.png`;

/** Strip broker suffixes/prefixes (#, ., m, _ …) → bare A-Z ticker. */
function clean(symbol: string): string {
  return (symbol || '').replace(/[^A-Za-z]/g, '').toUpperCase();
}

interface Props {
  symbol: string;
  segment?: string;
  size?: number;
}

/** Single circular slot: a coloured fallback (code centred) with a remote
 *  image layered on top via resizeMode "cover". If the image is missing or
 *  fails to load, the coloured circle stays visible — no error state needed. */
function CircleImage({ uri, code, bg, fg, size, fontSize }: {
  uri?: string; code: string; bg: string; fg: string; size: number; fontSize: number;
}) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Text variant="labelXs" weight="bold" style={{ color: fg, fontSize }}>{code}</Text>
      {uri ? (
        <Image source={{ uri }} style={{ position: 'absolute', width: size, height: size }} resizeMode="cover" />
      ) : null}
    </View>
  );
}

/** Solid coloured circle with a centred glyph (commodities). */
function GlyphCircle({ bg, size, children }: { bg: string; size: number; children: React.ReactNode }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  );
}

/** Gold-bars style metal icon, drawn with SVG (offline, no CDN). A metallic
 *  gradient disc with three stacked "bars" — gold/silver/etc per `light/dark`. */
function MetalCircle({ size, light, dark }: { size: number; light: string; dark: string }) {
  const id = `mg-${dark.replace('#', '')}`;
  const bar = { w: size * 0.2, h: size * 0.13, r: size * 0.02, fill: light, stroke: dark } as const;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={light} />
          <Stop offset="1" stopColor={dark} />
        </LinearGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      {/* three stacked bars (2 bottom, 1 top) */}
      <Rect x={size * 0.28} y={size * 0.52} width={bar.w} height={bar.h} rx={bar.r} fill={bar.fill} stroke={bar.stroke} strokeWidth={0.5} />
      <Rect x={size * 0.52} y={size * 0.52} width={bar.w} height={bar.h} rx={bar.r} fill={bar.fill} stroke={bar.stroke} strokeWidth={0.5} />
      <Rect x={size * 0.40} y={size * 0.37} width={bar.w} height={bar.h} rx={bar.r} fill={bar.fill} stroke={bar.stroke} strokeWidth={0.5} />
    </Svg>
  );
}

/** Instrument logo: forex → overlapping flag pair; crypto → coin icon;
 *  metals/commodities → glyph tile; indices → exchange flag; else code circle. */
export function InstrumentIcon({ symbol, segment, size = 36 }: Props) {
  const theme = useTheme();
  const t = clean(symbol);
  const base = t.slice(0, 3);
  const quote = t.length >= 6 ? t.slice(3, 6) : '';
  const seg = (segment ?? '').toLowerCase();
  const glyphSize = Math.round(size * 0.5);

  // Precious metals — XAUUSD → gold-bars icon + quote-currency flag (pair),
  // mirroring the reference (gold bars + US flag). Standalone if no quote flag.
  const metal = METALS[base];
  if (metal) {
    const mQuoteIso = CCY_TO_ISO[quote];
    if (!mQuoteIso) {
      return (
        <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
          <MetalCircle size={size} light={metal.light} dark={metal.dark} />
        </View>
      );
    }
    const sub = Math.round(size * 0.62);
    return (
      <View style={{ width: size, height: size }}>
        <View style={{ position: 'absolute', top: 0, left: 0, width: sub, height: sub, borderRadius: sub / 2, overflow: 'hidden' }}>
          <MetalCircle size={sub} light={metal.light} dark={metal.dark} />
        </View>
        <View style={{ position: 'absolute', bottom: 0, right: 0, borderRadius: sub / 2 + 1.5, padding: 1.5, backgroundColor: theme.colors.bg.base }}>
          <CircleImage uri={flagUrl(mQuoteIso)} code={quote.slice(0, 2)} bg={theme.colors.bg.chip} fg={theme.colors.text.secondary} size={sub} fontSize={8} />
        </View>
      </View>
    );
  }

  // Commodities — oil / gas / copper → glyph tile.
  const commodity = COMMODITY[t];
  if (commodity) {
    const color = '#FFFFFF';
    return (
      <GlyphCircle bg={commodity.bg} size={size}>
        {commodity.glyph === 'oil' ? <Droplet size={glyphSize} color={color} strokeWidth={2.2} />
          : commodity.glyph === 'gas' ? <Flame size={glyphSize} color={color} strokeWidth={2.2} />
          : <Coins size={glyphSize} color={color} strokeWidth={2.2} />}
      </GlyphCircle>
    );
  }

  // Forex — both legs map to a known fiat currency → overlapping flag pair.
  const baseIso = CCY_TO_ISO[base];
  const quoteIso = CCY_TO_ISO[quote];
  if (baseIso && quoteIso) {
    const sub = Math.round(size * 0.62);
    return (
      <View style={{ width: size, height: size }}>
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          <CircleImage uri={flagUrl(baseIso)} code={base.slice(0, 2)} bg={theme.colors.bg.chip} fg={theme.colors.text.secondary} size={sub} fontSize={8} />
        </View>
        <View style={{ position: 'absolute', bottom: 0, right: 0, borderRadius: sub / 2 + 1.5, padding: 1.5, backgroundColor: theme.colors.bg.base }}>
          <CircleImage uri={flagUrl(quoteIso)} code={quote.slice(0, 2)} bg={theme.colors.bg.chip} fg={theme.colors.text.secondary} size={sub} fontSize={8} />
        </View>
      </View>
    );
  }

  // Crypto — segment says crypto, or quote is USD/USDT with a non-fiat base.
  const isCrypto = seg === 'crypto' || ((quote === 'USD' || quote === 'USDT' || t.endsWith('USDT')) && !baseIso);
  if (isCrypto) {
    return <CircleImage uri={cryptoUrl(base)} code={base.slice(0, 3)} bg={theme.colors.bg.chip} fg={theme.colors.text.secondary} size={size} fontSize={11} />;
  }

  // Indices — map to the exchange's country flag (e.g. NAS100 → US flag).
  const idxIso = INDEX_TO_ISO[t] ?? INDEX_TO_ISO[t.slice(0, 3)];
  if (idxIso && seg !== 'commodities') {
    return <CircleImage uri={flagUrl(idxIso)} code={base.slice(0, 2)} bg={theme.colors.bg.chip} fg={theme.colors.text.secondary} size={size} fontSize={9} />;
  }

  // Stocks / unknown → code circle.
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.bg.chip, alignItems: 'center', justifyContent: 'center' }}>
      <Text variant="labelXs" tone="secondary" weight="bold" style={{ fontSize: 11 }}>{base}</Text>
    </View>
  );
}
