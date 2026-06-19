import { useThemeStore } from '@/stores/themeStore';
import { darkColors, lightColors, type ColorScheme } from './colors';
import { textStyles, sizes, weights, type TextVariant } from './typography';
import { spacing, radius, hitTargets } from './spacing';

export type Theme = {
  scheme: 'dark' | 'light';
  colors: ColorScheme;
  text: typeof textStyles;
  sizes: typeof sizes;
  weights: typeof weights;
  spacing: typeof spacing;
  radius: typeof radius;
  hitTargets: typeof hitTargets;
};

const darkTheme: Theme = {
  scheme: 'dark',
  colors: darkColors,
  text: textStyles,
  sizes,
  weights,
  spacing,
  radius,
  hitTargets,
};

const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  text: textStyles,
  sizes,
  weights,
  spacing,
  radius,
  hitTargets,
};

/** Resolve the active theme from the user's choice — dark or light only.
 *  Dark is the default (web-trader / CLAUDE.md "near-black #08090b" canon). */
export function useTheme(): Theme {
  const mode = useThemeStore((s) => s.mode);
  return mode === 'light' ? lightTheme : darkTheme;
}

export { darkTheme, lightTheme };
export type { ColorScheme, TextVariant };
