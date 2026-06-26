// Premium fintech theme (Apple × Revolut × TradingView × Binance × Stripe).
// Dark = deep navy-black luxury (#05070C) with floating glass cards + emerald
// glow; Light = soft banking white (#F6F8FB) with white cards. Negative = red.
// Greens tuned per scheme — neon brand green is unreadable as text on white,
// so light mode uses a deeper emerald for accents.

// ── DARK ──────────────────────────────────────────────────────────────────
export const darkColors = {
  buy: '#39FF6A',        // primary
  buyDark: '#00D45A',    // accent / pressed
  buyLight: '#6BFF92',
  buyBg: 'rgba(57,255,106,0.10)',
  buyGlow: 'rgba(57,255,106,0.25)',
  buySubtle: '#0C2A16',
  sell: '#FF4D5E',       // loss / negative
  sellDark: '#E03E4E',
  sellLight: '#FF6B78',
  sellBg: 'rgba(255,77,94,0.10)',
  sellGlow: 'rgba(255,77,94,0.22)',
  sellSubtle: '#2A0E12',
  warning: '#F5A623',
  info: '#39FF6A',
  danger: '#FF4D5E',
  success: '#39FF6A',
  bg: {
    base: '#05070C',        // background
    primary: '#05070C',
    secondary: '#161F2C',   // cards
    tertiary: '#111A24',    // surface
    hover: '#1E2937',
    active: '#26323F',
    input: '#0E151F',
    chip: '#1A2531',
    glass: 'rgba(22,31,44,0.72)',
    glassBorder: 'rgba(255,255,255,0.08)',
    rowTintUp: 'rgba(57,255,106,0.05)',
    rowTintDown: 'rgba(255,77,94,0.05)',
  },
  border: {
    primary: 'rgba(255,255,255,0.08)',
    secondary: 'rgba(255,255,255,0.12)',
    accent: 'rgba(57,255,106,0.35)',
  },
  text: {
    primary: '#F4F7FB',
    secondary: '#A8B3C2',
    tertiary: '#6B7585',
    inverse: '#05070C',
    accent: '#39FF6A',
  },
  glow: 'rgba(57,255,106,0.25)',
  gradient: {
    screen: ['#0A1018', '#05070C', '#03050A'],
  },
  overlay: 'rgba(0,0,0,0.62)',
} as const;

// ── LIGHT ─────────────────────────────────────────────────────────────────
export const lightColors = {
  buy: '#13B24A',
  buyDark: '#0E9A3F',
  buyLight: '#39FF6A',
  buyBg: 'rgba(19,178,74,0.10)',
  buyGlow: 'rgba(57,255,106,0.18)',
  buySubtle: '#E6FBEC',
  sell: '#F0384B',
  sellDark: '#D62D3F',
  sellLight: '#FF5C6B',
  sellBg: 'rgba(240,56,75,0.10)',
  sellGlow: 'rgba(240,56,75,0.18)',
  sellSubtle: '#FCE9EB',
  warning: '#E8920C',
  info: '#13B24A',
  danger: '#F0384B',
  success: '#13B24A',
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
    rowTintUp: 'rgba(19,178,74,0.06)',
    rowTintDown: 'rgba(240,56,75,0.06)',
  },
  border: {
    primary: '#E5EAF0',
    secondary: '#D8DEE7',
    accent: 'rgba(19,178,74,0.45)',
  },
  text: {
    primary: '#0B1119',
    secondary: '#5A6675',
    tertiary: '#8A95A5',
    inverse: '#FFFFFF',
    accent: '#0E9A3F',
  },
  glow: 'rgba(19,178,74,0.20)',
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
