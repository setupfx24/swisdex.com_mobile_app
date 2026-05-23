// Brand colors mirror the web trader's tailwind.config.ts (canon: green-on-black,
// not the outdated "gold-on-black" comment in the web config). Light mode mirrors
// the same discipline inverted — CLAUDE.md design rule "Light mode: same
// discipline, inverted." Both palettes use the same accent / sell hues so brand
// recognition survives a system theme switch.

export interface ColorScheme {
  bg: {
    base: string;
    primary: string;
    secondary: string;
    tertiary: string;
    hover: string;
    active: string;
    input: string;
  };
  border: {
    primary: string;
    secondary: string;
    accent: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    accent: string;
  };
  // Trading accents — same hue across schemes for brand recognition
  buy: string;
  buyLight: string;
  buyDark: string;
  buyBg: string;
  buyGlow: string;
  sell: string;
  sellLight: string;
  sellDark: string;
  sellBg: string;
  sellGlow: string;
  warning: string;
  info: string;
  danger: string;
  success: string;
  overlay: string;
}

const sharedAccents = {
  buy: '#55a630',         // web canon — accent / buy / long
  buyLight: '#7dc24f',
  buyDark: '#3f7d22',
  buyBg: 'rgba(85,166,48,0.10)',
  buyGlow: 'rgba(85,166,48,0.22)',
  sell: '#FF3B5C',        // brighter on mobile than web (#ef4444) so reds read on AMOLED
  sellLight: '#ff6680',
  sellDark: '#c91a3a',
  sellBg: 'rgba(255,59,92,0.10)',
  sellGlow: 'rgba(255,59,92,0.22)',
  warning: '#FFB300',
  info: '#29B6F6',
  danger: '#FF1744',
  success: '#3f7d22',
};

export const darkColors: ColorScheme = {
  ...sharedAccents,
  bg: {
    base: '#08090b',        // web canon
    primary: '#0e0f12',
    secondary: '#15161A',   // surfaces / sheets
    tertiary: '#1A1B20',
    hover: '#1F2024',
    active: '#26272D',
    input: '#101114',
  },
  border: {
    // Borders sit just above bg.secondary so they read as a hairline divider,
    // not a frame. Per CLAUDE.md: "1px horizontal dividers for separation".
    primary: '#1F2024',
    secondary: '#26272D',
    accent: 'rgba(85,166,48,0.35)',
  },
  text: {
    primary: '#E8E9EE',
    secondary: '#8A8D96',
    tertiary: '#5A5D66',
    inverse: '#0E0F12',
    accent: '#7dc24f',
  },
  overlay: 'rgba(0,0,0,0.6)',
};

export const lightColors: ColorScheme = {
  ...sharedAccents,
  bg: {
    base: '#FAFBFC',
    primary: '#FFFFFF',
    secondary: '#F2F3F5',
    tertiary: '#E8EAED',
    hover: '#EDEFF2',
    active: '#E1E4E8',
    input: '#FFFFFF',
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
    accent: '#3f7d22',
  },
  overlay: 'rgba(8,9,11,0.5)',
};
