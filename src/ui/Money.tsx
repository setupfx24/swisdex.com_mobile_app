import { useMemo } from 'react';
import { type TextStyle } from 'react-native';
import { Text, type TextProps } from './Text';
import { fmtAccountMoney } from '@/lib/money';
import { useTheme } from '@/theme';

// Loss colour — the theme's `sell` token is green in the green-glass theme,
// so P/L losses need an explicit red to read as a loss.
const PNL_RED = '#FF5C5C';

interface MoneyProps extends Omit<TextProps, 'children' | 'tone'> {
  /** Amount in USD (backend always stores USD). */
  value: number | null | undefined;
  /** Cent account → render in ¢ (value ×100). */
  isCent?: boolean;
  decimals?: number;
  /** Render +/- prefix (P&L convention). */
  signed?: boolean;
  /** Auto-colour positive green / negative red. */
  pnl?: boolean;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'buy' | 'sell' | 'warning' | 'inverse';
  placeholder?: string;
}

/** Cent-aware money renderer. Shows ¢ (×100) for cent accounts, $ USD otherwise,
 *  with optional P&L colouring — the money-display counterpart to <Num>. */
export function Money({
  value,
  isCent = false,
  decimals = 2,
  signed = false,
  pnl = false,
  tone,
  placeholder = '—',
  variant = 'num',
  style,
  ...rest
}: MoneyProps) {
  const theme = useTheme();
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? ''));

  const text = useMemo(() => {
    if (value == null || !Number.isFinite(num)) return placeholder;
    return fmtAccountMoney(num, isCent, { decimals, signDisplay: signed ? 'always' : 'auto' });
  }, [value, num, isCent, decimals, signed, placeholder]);

  const resolvedTone: MoneyProps['tone'] = useMemo(() => {
    if (tone) return tone;
    if (!pnl) return 'primary';
    if (!Number.isFinite(num) || num === 0) return 'secondary';
    return 'buy';
  }, [tone, pnl, num]);

  // P/L: profit → green (tone buy), loss → explicit red (theme sell is green).
  const pnlColor = pnl && !tone && Number.isFinite(num) && num < 0 ? PNL_RED
    : pnl && !tone && Number.isFinite(num) && num > 0 ? theme.colors.buy
      : undefined;

  const explicitStyle: TextStyle = { fontVariant: ['tabular-nums'] };

  return (
    <Text variant={variant} tone={resolvedTone} skipTranslate style={[explicitStyle, pnlColor ? { color: pnlColor } : null, style]} {...rest}>
      {text}
    </Text>
  );
}
