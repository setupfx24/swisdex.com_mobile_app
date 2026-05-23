import { Platform, type TextStyle } from 'react-native';

const bodyFamily = Platform.select({
  ios: 'SF Pro Text',
  default: undefined,
});

const monoFamily = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const sizes = {
  xxs: 10,
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  display: 28,
  hero: 36,
} as const;

export const weights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

export const textStyles = {
  displayHero: {
    fontFamily: bodyFamily,
    fontSize: sizes.hero,
    fontWeight: weights.bold,
    letterSpacing: -0.72,
    fontVariant: ['tabular-nums'],
  },
  displayLarge: {
    fontFamily: bodyFamily,
    fontSize: sizes.display,
    fontWeight: weights.bold,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  h1: {
    fontFamily: bodyFamily,
    fontSize: sizes.xxl,
    fontWeight: weights.bold,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: bodyFamily,
    fontSize: sizes.xl,
    fontWeight: weights.bold,
    letterSpacing: -0.2,
  },
  bodyLg: {
    fontFamily: bodyFamily,
    fontSize: sizes.lg,
    fontWeight: weights.medium,
    lineHeight: 22,
  },
  bodyMd: {
    fontFamily: bodyFamily,
    fontSize: sizes.md,
    fontWeight: weights.regular,
    lineHeight: 20,
  },
  body: {
    fontFamily: bodyFamily,
    fontSize: sizes.md,
    fontWeight: weights.regular,
    lineHeight: 20,
  },
  label: {
    fontFamily: bodyFamily,
    fontSize: sizes.sm,
    fontWeight: weights.medium,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  labelXs: {
    fontFamily: bodyFamily,
    fontSize: sizes.xs,
    fontWeight: weights.medium,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  num: {
    fontFamily: bodyFamily,
    fontSize: sizes.md,
    fontWeight: weights.bold,
    fontVariant: ['tabular-nums'],
  },
  numLg: {
    fontFamily: bodyFamily,
    fontSize: sizes.lg,
    fontWeight: weights.bold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  numXl: {
    fontFamily: bodyFamily,
    fontSize: sizes.xl,
    fontWeight: weights.bold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  numXxl: {
    fontFamily: bodyFamily,
    fontSize: sizes.display,
    fontWeight: weights.bold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  mono: {
    fontFamily: monoFamily,
    fontSize: sizes.sm,
    fontWeight: weights.regular,
  },
  // Vantage scale (April 2026) — co-exists with legacy h1/h2/bodyMd
  // so older screens render unchanged while new screens use spec names.
  title1: {
    fontFamily: bodyFamily,
    fontSize: 22,
    fontWeight: weights.bold,
    letterSpacing: -0.3,
  },
  title2: {
    fontFamily: bodyFamily,
    fontSize: 18,
    fontWeight: weights.bold,
  },
  bodyM: {
    fontFamily: bodyFamily,
    fontSize: 16,
    fontWeight: weights.medium,
    lineHeight: 22,
  },
  bodyR: {
    fontFamily: bodyFamily,
    fontSize: 14,
    fontWeight: weights.regular,
    lineHeight: 20,
  },
  bodyB: {
    fontFamily: bodyFamily,
    fontSize: 14,
    fontWeight: weights.bold,
    fontVariant: ['tabular-nums'],
  },
  caption: {
    fontFamily: bodyFamily,
    fontSize: 12,
    fontWeight: weights.regular,
    lineHeight: 16,
  },
  captionB: {
    fontFamily: bodyFamily,
    fontSize: 12,
    fontWeight: weights.semibold,
    lineHeight: 16,
  },
  tabLabel: {
    fontFamily: bodyFamily,
    fontSize: 11,
    fontWeight: weights.medium,
    letterSpacing: 0.2,
  },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textStyles;
