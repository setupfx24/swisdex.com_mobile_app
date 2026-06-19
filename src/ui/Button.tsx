import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { useTheme } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'buy' | 'sell';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps {
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to fill parent width. Default true — matches trading-app patterns. */
  fullWidth?: boolean;
  /** Override the background + border colour (fg stays white). Used for
   *  one-off CTAs that need a colour outside the variant set. */
  color?: string;
  /** Round pill shape (radius 999) for hero CTAs like the reference design. */
  pill?: boolean;
  /** Force the coloured glow on/off. Defaults ON for coloured variants in dark mode. */
  glow?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Single-line text button. Composes Pressable (haptics) + Text + theme
 *  tokens. The 'xl' size matches the 56pt buy/sell button per CLAUDE.md.
 *  buy/sell variants exist so the trading terminal doesn't need to repeat
 *  the green/red rules — read as 'this is a directional trade action'. */
export function Button({
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  color,
  pill = false,
  glow,
  children,
  style,
}: ButtonProps) {
  const theme = useTheme();

  // Tightened buttons: smaller radius, less padding, slightly smaller text.
  const height = size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 44 : 50;
  const paddingH = size === 'sm' ? 12 : size === 'md' ? 14 : 16;
  const fontSize = size === 'xl' ? 15 : 13;

  const palette = (() => {
    switch (variant) {
      case 'primary':
        return { bg: theme.colors.buy, border: theme.colors.buy, fg: '#FFFFFF' };
      case 'buy':
        return { bg: theme.colors.buy, border: theme.colors.buy, fg: '#FFFFFF' };
      case 'sell':
        return { bg: theme.colors.sell, border: theme.colors.sell, fg: '#FFFFFF' };
      case 'danger':
        return { bg: theme.colors.danger, border: theme.colors.danger, fg: '#FFFFFF' };
      case 'secondary':
        return { bg: theme.colors.bg.secondary, border: theme.colors.border.primary, fg: theme.colors.text.primary };
      case 'ghost':
        return { bg: 'transparent', border: 'transparent', fg: theme.colors.text.primary };
    }
  })();

  const inactive = disabled || loading;

  // Coloured CTAs get a soft glow in dark mode (matches the reference design).
  const colouredVariant = variant === 'primary' || variant === 'buy' || variant === 'sell' || variant === 'danger' || !!color;
  const glowOn = (glow ?? (theme.scheme === 'dark' && colouredVariant)) && !inactive;
  const glowColor = color ?? (variant === 'sell' || variant === 'danger' ? theme.colors.sell : theme.colors.buy);

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      haptic={variant === 'buy' || variant === 'sell' ? 'medium' : 'light'}
      disabled={inactive}
      style={({ pressed }) => [
        {
          height,
          paddingHorizontal: paddingH,
          borderRadius: pill ? 999 : 10,
          backgroundColor: color ?? palette.bg,
          borderWidth: 1,
          borderColor: color ?? palette.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          flexDirection: 'row',
          gap: 8,
        },
        glowOn ? {
          shadowColor: glowColor,
          shadowOpacity: 0.55,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        } : null,
        style as ViewStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Text
            variant={size === 'xl' ? 'bodyLg' : 'bodyMd'}
            weight="bold"
            style={{ color: palette.fg, fontSize }}
          >
            {children}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
