// Half-pixel scale matching the web trader's tailwind config. Reading
// `spacing[4]` (= 16px) anywhere in the codebase should land at the same
// optical position as the web app's `p-4`. Numeric keys (not 'sm/md/lg')
// because the web app's design system uses the same scheme and we want
// 1:1 translatability when porting components.

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
  sm: 4,
  base: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
} as const;

// Minimum touch target per CLAUDE.md: 44pt (iOS HIG). Use this anywhere a user
// can tap so density-driven UIs stay accessible.
export const hitTargets = {
  min: 44,
  comfortable: 48,
  buyButton: 56, // CLAUDE.md "Buy/Sell buttons: 56pt tall, full-width"
} as const;
