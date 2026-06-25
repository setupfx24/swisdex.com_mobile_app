// Premium fintech theme (Apple / Stripe / Revolut / Binance / TradingView).
// Brand: neon emerald #39FF14. Dark = deep black-navy luxury (#060B12) with
// floating cards + green glow; Light = soft banking white (#F6F8FB). Negative
// = clean red. Greens are tuned PER SCHEME (neon is unreadable as text on white,
// so light mode uses a deeper emerald for accents).

// ── DARK ──────────────────────────────────────────────────────────────────
export const darkColors = {
  buy: '#39FF14',
  buyDark: '#2ED60F',
  buyLight: '#6BFF52',
  buyBg: 'rgba(57,255,20,0.10)',
  buyGlow: 'rgba(57,255,20,0.25)',
  buySubtle: '#0C2A0E',
  sell: '#FF4D5E',
  sellDark: '#E03E4E',
  sellLight: '#FF6B78',
  sellBg: 'rgba(255,77,94,0.10)',
  sellGlow: 'rgba(255,77,94,0.22)',
  sellSubtle: '#2A0E12',
  warning: '#F5A623',
  info: '#39FF14',
  danger: '#FF4D5E',
  success: '#39FF14',
  bg: {
    base: '#060B12',        // deep black-navy primary background
    primary: '#060B12',
    secondary: '#0E1622',   // cards (navy)
    tertiary: '#141E2C',    // raised surface
    hover: '#1A2433',
    active: '#212C3D',
    input: '#0B1119',
    chip: '#18222F',
    glass: 'rgba(14,22,34,0.72)',
    glassBorder: 'rgba(255,255,255,0.07)',
    rowTintUp: 'rgba(57,255,20,0.05)',
    rowTintDown: 'rgba(255,77,94,0.05)',
  },
  border: {
    primary: 'rgba(255,255,255,0.06)',
    secondary: 'rgba(255,255,255,0.10)',
    accent: 'rgba(57,255,20,0.35)',
  },
  text: {
    primary: '#F5F8FC',
    secondary: '#93A1B5',
    tertiary: '#5C6B80',
    inverse: '#060B12',
    accent: '#39FF14',
  },
  glow: 'rgba(57,255,20,0.25)',
  gradient: {
    // Deep black → navy → black, never flat.
    screen: ['#0A1422', '#070D16', '#04070C'],
  },
  overlay: 'rgba(0,0,0,0.62)',
} as const;

// ── LIGHT ─────────────────────────────────────────────────────────────────
export const lightColors = {
  buy: '#17C04F',
  buyDark: '#12A344',
  buyLight: '#39FF14',
  buyBg: 'rgba(23,192,79,0.10)',
  buyGlow: 'rgba(57,255,20,0.18)',
  buySubtle: '#E6FBEC',
  sell: '#F0384B',
  sellDark: '#D62D3F',
  sellLight: '#FF5C6B',
  sellBg: 'rgba(240,56,75,0.10)',
  sellGlow: 'rgba(240,56,75,0.18)',
  sellSubtle: '#FCE9EB',
  warning: '#E8920C',
  info: '#17C04F',
  danger: '#F0384B',
  success: '#17C04F',
  bg: {
    base: '#F6F8FB',
    primary: '#FFFFFF',
    secondary: '#FFFFFF',   // cards
    tertiary: '#EEF3F8',
    hover: '#EEF3F8',
    active: '#E5EAF0',
    input: '#FFFFFF',
    chip: '#EEF3F8',
    glass: 'rgba(255,255,255,0.82)',
    glassBorder: '#E5EAF0',
    rowTintUp: 'rgba(23,192,79,0.06)',
    rowTintDown: 'rgba(240,56,75,0.06)',
  },
  border: {
    primary: '#E5EAF0',
    secondary: '#D8DEE7',
    accent: 'rgba(23,192,79,0.45)',
  },
  text: {
    primary: '#0B1119',
    secondary: '#5A6675',
    tertiary: '#8A95A5',
    inverse: '#FFFFFF',
    accent: '#0E9F43',
  },
  glow: 'rgba(23,192,79,0.20)',
  gradient: {
    screen: ['#F6F8FB', '#F6F8FB'],
  },
  overlay: 'rgba(8,9,11,0.5)',
} as const;

export type ColorScheme = {
  buy: string; buyDark: string; buyLight: string; buyBg: string; buyGlow: string; buySubtle: string;
  sell: string; sellDark: string; sellLight: string; sellBg: string; sellGlow: string; sellSubtle: string;
  warning: string; info: string; danger: string; success: string;
  bg: {
    base: string; primary: string; secondary: string; tertiary: string;
    hover: string; active: string; input: string; chip: string;
    glass: string; glassBorder: string;
    rowTintUp: string; rowTintDown: string;
  };
  border: { primary: string; secondary: string; accent: string };
  text: { primary: string; secondary: string; tertiary: string; inverse: string; accent: string };
  glow: string;
  gradient: { screen: readonly string[] };
  overlay: string;
};
