import { useColorScheme } from 'react-native';
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

/** Resolve the active theme from the OS color scheme. Dark is the default —
 *  matches the web trader and CLAUDE.md's "near-black #08090b" canon. */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'light' ? lightTheme : darkTheme;
}

export { darkTheme, lightTheme };
export type { ColorScheme, TextVariant };
