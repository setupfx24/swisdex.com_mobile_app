import { useMemo } from 'react';
import { type TextStyle } from 'react-native';
import { Text, type TextProps } from './Text';
import { useTheme } from '@/theme';

interface NumProps extends Omit<TextProps, 'children' | 'tone'> {
  value: number | string | null | undefined;
  /** Decimal places to render. Defaults to symbol-specific digits for prices. */
  digits?: number;
  /** Render +/- prefix for positive numbers (PnL view convention). */
  signed?: boolean;
  /** Auto-color positive green / negative red — useful for PnL columns. */
  pnl?: boolean;
  /** Explicit tone override; pnl=true sets this automatically. */
  tone?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'buy' | 'sell' | 'warning' | 'inverse';
  /** Append text (currency, %, etc.) without breaking tabular alignment. */
  suffix?: string;
  /** Render as "--" when value is null/undefined/NaN. */
  placeholder?: string;
}

/** Number rendering primitive. Always tabular-nums so price digits don't shift
 *  on tick updates (CLAUDE.md: "tabular-nums for ALL prices/PnL").
 *  Wrap real numbers, not bare strings, so the formatter handles null/NaN. */
export function Num({
  value,
  digits = 2,
  signed = false,
  pnl = false,
  tone,
  suffix,
  placeholder = '—',
  variant = 'num',
  style,
  ...rest
}: NumProps) {
  const theme = useTheme();
  const text = useMemo(() => {
    if (value == null || value === '') return placeholder;
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    if (!Number.isFinite(n)) return placeholder;
    const formatted = n.toFixed(digits);
    return signed && n > 0 ? `+${formatted}` : formatted;
  }, [value, digits, signed, placeholder]);

  // Auto-tone for PnL columns. Zero stays neutral so a flat position doesn't
  // flash colour the moment it kisses break-even.
  const resolvedTone: NumProps['tone'] = useMemo(() => {
    if (tone) return tone;
    if (!pnl) return 'primary';
    const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
    if (!Number.isFinite(n) || n === 0) return 'secondary';
    return n > 0 ? 'buy' : 'sell';
  }, [tone, pnl, value]);

  const explicitStyle: TextStyle | undefined = useMemo(
    () => ({ fontVariant: ['tabular-nums'] }),
    [],
  );

  return (
    <Text
      variant={variant}
      tone={resolvedTone}
      style={[explicitStyle, style]}
      {...rest}
    >
      {text}
      {suffix ? <Text variant={variant} tone="tertiary" style={{ fontWeight: theme.weights.regular }}> {suffix}</Text> : null}
    </Text>
  );
}
