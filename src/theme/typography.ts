import { Platform, type TextStyle } from 'react-native';

// 3 weights only (CLAUDE.md): 400 body, 500 labels, 700 numbers. iOS gets SF Pro
// for body and SF Mono for numbers via system font names; Android gets the system
// default. Roboto is the Android default and CLAUDE.md forbids it for body text
// — Phase 2+ can swap in Inter via expo-font once we have an asset bundle to
// register. For now, system fonts ship instantly and the typography discipline
// (sizes, weights, letter-spacing) is what makes the app read "professional",
// not the typeface itself.

const bodyFamily = Platform.select({
  ios: 'SF Pro Text',
  default: undefined, // system default — swap to Inter post-MVP
});

const numberFamily = Platform.select({
  ios: 'SF Pro Text',  // tabular figures via fontVariant
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
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;

export const weights = {
  regular: '400',
  medium: '500',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

// Pre-baked text styles. Keep this list short — adding a one-off style is a
// code smell signalling a missing primitive. If a screen needs something new,
// extend a primitive component instead of adding another style here.
export const textStyles = {
  // Bodies
  body: {
    fontFamily: bodyFamily,
    fontSize: sizes.base,
    fontWeight: weights.regular,
    lineHeight: 20,
  },
  bodyMd: {
    fontFamily: bodyFamily,
    fontSize: sizes.md,
    fontWeight: weights.regular,
    lineHeight: 20,
  },
  bodyLg: {
    fontFamily: bodyFamily,
    fontSize: sizes.lg,
    fontWeight: weights.regular,
    lineHeight: 24,
  },
  // Labels — uppercase, dense, used for column headers and section tags
  label: {
    fontFamily: bodyFamily,
    fontSize: sizes.xs,
    fontWeight: weights.medium,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  labelXs: {
    fontFamily: bodyFamily,
    fontSize: sizes.xxs,
    fontWeight: weights.medium,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  // Numbers — tabular figures so price digits don't jitter on tick updates
  num: {
    fontFamily: numberFamily,
    fontSize: sizes.base,
    fontWeight: weights.bold,
    fontVariant: ['tabular-nums'],
  },
  numLg: {
    fontFamily: numberFamily,
    fontSize: sizes.lg,
    fontWeight: weights.bold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  numXl: {
    fontFamily: numberFamily,
    fontSize: sizes.xl,
    fontWeight: weights.bold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  numXxl: {
    fontFamily: numberFamily,
    fontSize: sizes.xxl,
    fontWeight: weights.bold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  // Headings — used sparingly (screen titles, modal headers)
  h1: {
    fontFamily: bodyFamily,
    fontSize: sizes.xxl,
    fontWeight: weights.bold,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: bodyFamily,
    fontSize: sizes.xl,
    fontWeight: weights.bold,
    letterSpacing: -0.3,
  },
  // Mono — for IDs, account numbers, code. NEVER for prices.
  mono: {
    fontFamily: monoFamily,
    fontSize: sizes.sm,
    fontWeight: weights.regular,
  },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textStyles;
