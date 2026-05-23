import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme, type TextVariant } from '@/theme';

type Tone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'buy' | 'sell' | 'warning' | 'inverse';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: Tone;
  align?: TextStyle['textAlign'];
  weight?: 'regular' | 'medium' | 'bold';
}

/** Single typography entry point. Avoid using RN's Text directly anywhere —
 *  variant tokens keep size/weight/leading consistent and changing the rules
 *  becomes a one-file edit instead of a grep-and-replace across screens. */
export function Text({
  variant = 'body',
  tone = 'primary',
  align,
  weight,
  style,
  children,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const base = theme.text[variant];
  const color =
    tone === 'buy'
      ? theme.colors.buy
      : tone === 'sell'
        ? theme.colors.sell
        : tone === 'warning'
          ? theme.colors.warning
          : tone === 'inverse'
            ? theme.colors.text.inverse
            : tone === 'accent'
              ? theme.colors.text.accent
              : theme.colors.text[tone];
  return (
    <RNText
      {...rest}
      style={[
        base,
        { color, textAlign: align },
        weight ? { fontWeight: theme.weights[weight] } : null,
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
