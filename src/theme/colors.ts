// Vantage-inspired brand tokens. SwisDex retains the canon green #55a630
// (web tailwind) instead of Vantage's orange — everything else mirrors
// Vantage's April 2026 mobile redesign palette.

// Green-only theme. Buy uses the canon bright lime-green; sell / loss /
// danger use a DEEPER green so they stay visually distinct (e.g. the
// SELL vs BUY price button) without bringing in a second hue. Warning /
// info are greened too so the whole app reads as one green family.
const sharedAccents = {
  buy: '#55a630',
  buyDark: '#3f7c24',
  buyLight: '#6bc93b',
  buyBg: 'rgba(85,166,48,0.10)',
  buyGlow: 'rgba(85,166,48,0.22)',
  buySubtle: '#1A2F12',
  sell: '#1E7A3C',
  sellDark: '#155C2C',
  sellLight: '#2E9D52',
  sellBg: 'rgba(30,122,60,0.12)',
  sellGlow: 'rgba(30,122,60,0.24)',
  sellSubtle: '#0E2417',
  warning: '#8BC34A',
  info: '#55a630',
  danger: '#1E7A3C',
  success: '#55a630',
} as const;

// Dark mode = deep green-black gradient + frosted "glass" surfaces (translucent
// so the gradient shows through) + a green glow for CTAs. Cards use the
// translucent bg.secondary so even screens not explicitly wrapped read glassy.
export const darkColors = {
  ...sharedAccents,
  bg: {
    base: '#0A0F0B',
    primary: '#0A0F0B',
    secondary: 'rgba(22,32,24,0.55)',
    tertiary: 'rgba(32,44,34,0.60)',
    hover: 'rgba(44,58,46,0.60)',
    active: 'rgba(54,70,56,0.66)',
    input: 'rgba(16,24,18,0.55)',
    chip: 'rgba(44,58,46,0.50)',
    glass: 'rgba(22,32,24,0.55)',
    glassBorder: 'rgba(120,200,120,0.14)',
    rowTintUp: 'rgba(85,166,48,0.05)',
    rowTintDown: 'rgba(30,122,60,0.05)',
  },
  border: {
    primary: 'rgba(120,200,120,0.10)',
    secondary: 'rgba(120,200,120,0.16)',
    accent: 'rgba(85,166,48,0.35)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#9CA3AF',
    tertiary: '#6B7280',
    inverse: '#08090b',
    accent: '#6bc93b',
  },
  glow: 'rgba(85,166,48,0.45)',
  gradient: {
    screen: ['#10231A', '#0A0F0B', '#08090b'],
  },
  overlay: 'rgba(0,0,0,0.6)',
} as const;

export const lightColors = {
  ...sharedAccents,
  bg: {
    base: '#FAFBFC',
    primary: '#FFFFFF',
    secondary: '#F2F3F5',
    tertiary: '#E8EAED',
    hover: '#EDEFF2',
    active: '#E1E4E8',
    input: '#FFFFFF',
    chip: '#E5E7EA',
    glass: 'rgba(255,255,255,0.72)',
    glassBorder: '#E5E7EA',
    rowTintUp: 'rgba(85,166,48,0.06)',
    rowTintDown: 'rgba(30,122,60,0.06)',
  },
  border: {
    primary: '#E5E7EA',
    secondary: '#D8DBDF',
    accent: 'rgba(85,166,48,0.45)',
  },
  text: {
    primary: '#0E0F12',
    secondary: '#5A5D66',
    tertiary: '#8A8D96',
    inverse: '#FAFBFC',
    accent: '#3f7c24',
  },
  glow: 'rgba(85,166,48,0.22)',
  gradient: {
    // Flat in light mode — same stop twice so GradientBackground renders solid.
    screen: ['#FAFBFC', '#FAFBFC'],
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
