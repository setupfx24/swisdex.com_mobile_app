import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme, type TextVariant } from '@/theme';
import { useTranslated } from '@/lib/i18n';

type Tone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'buy' | 'sell' | 'warning' | 'inverse';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: Tone;
  align?: TextStyle['textAlign'];
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  /** Opt out of auto-translation (numbers, prices, symbols — see Num/Money). */
  skipTranslate?: boolean;
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
  skipTranslate = false,
  ...rest
}: TextProps) {
  const theme = useTheme();
  // Auto-translate plain string content into the active language. Non-string
  // children (numbers, nested elements/arrays) pass through untouched — each
  // nested <Text> leaf translates itself.
  const isString = typeof children === 'string';
  const translated = useTranslated(isString ? children : '');
  const content = !skipTranslate && isString ? translated : children;
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
      {content}
    </RNText>
  );
}
