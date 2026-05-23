export const spacing = {
  0: 0,
  '0.5': 2,
  1: 4,
  '1.5': 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const radius = {
  none: 0,
  sm: 6,
  base: 6,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 24,
  '3xl': 32,
  pill: 999,
  full: 9999,
} as const;

export const hitTargets = {
  min: 44,
  comfortable: 48,
  buyButton: 56,
  // Floating tab bar inset — screens should add this to bottom padding so
  // content doesn't disappear behind the pill.
  tabBarBottom: 96,
} as const;
