// Vantage-inspired brand tokens. SwisDex retains the canon green #55a630
// (web tailwind) instead of Vantage's orange — everything else mirrors
// Vantage's April 2026 mobile redesign palette.

const sharedAccents = {
  buy: '#55a630',
  buyDark: '#3f7c24',
  buyLight: '#6bc93b',
  buyBg: 'rgba(85,166,48,0.10)',
  buyGlow: 'rgba(85,166,48,0.22)',
  buySubtle: '#1A2F12',
  sell: '#FF2D55',
  sellDark: '#cc1f44',
  sellLight: '#ff5c80',
  sellBg: 'rgba(255,45,85,0.10)',
  sellGlow: 'rgba(255,45,85,0.22)',
  sellSubtle: '#3A1219',
  warning: '#F59E0B',
  info: '#3B82F6',
  danger: '#FF2D55',
  success: '#55a630',
} as const;

export const darkColors = {
  ...sharedAccents,
  bg: {
    base: '#08090b',
    primary: '#08090b',
    secondary: '#15161A',
    tertiary: '#1A1B20',
    hover: '#1F2024',
    active: '#26272D',
    input: '#101114',
    chip: '#1F2024',
    rowTintUp: 'rgba(85,166,48,0.04)',
    rowTintDown: 'rgba(255,45,85,0.04)',
  },
  border: {
    primary: '#1F2024',
    secondary: '#2A2B30',
    accent: 'rgba(85,166,48,0.35)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#9CA3AF',
    tertiary: '#6B7280',
    inverse: '#08090b',
    accent: '#6bc93b',
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
    rowTintUp: 'rgba(85,166,48,0.06)',
    rowTintDown: 'rgba(255,45,85,0.06)',
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
  overlay: 'rgba(8,9,11,0.5)',
} as const;

export type ColorScheme = {
  buy: string; buyDark: string; buyLight: string; buyBg: string; buyGlow: string; buySubtle: string;
  sell: string; sellDark: string; sellLight: string; sellBg: string; sellGlow: string; sellSubtle: string;
  warning: string; info: string; danger: string; success: string;
  bg: {
    base: string; primary: string; secondary: string; tertiary: string;
    hover: string; active: string; input: string; chip: string;
    rowTintUp: string; rowTintDown: string;
  };
  border: { primary: string; secondary: string; accent: string };
  text: { primary: string; secondary: string; tertiary: string; inverse: string; accent: string };
  overlay: string;
};
