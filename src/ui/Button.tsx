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
  children,
  style,
}: ButtonProps) {
  const theme = useTheme();

  const height = size === 'sm' ? 36 : size === 'md' ? 44 : size === 'lg' ? 48 : theme.hitTargets.buyButton;
  const paddingH = size === 'sm' ? 12 : size === 'md' ? 16 : 20;

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

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      haptic={variant === 'buy' || variant === 'sell' ? 'medium' : 'light'}
      disabled={inactive}
      style={({ pressed }) => [
        {
          height,
          paddingHorizontal: paddingH,
          borderRadius: theme.radius.md,
          backgroundColor: palette.bg,
          borderWidth: 1,
          borderColor: palette.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          flexDirection: 'row',
          gap: 8,
        },
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
            style={{ color: palette.fg }}
          >
            {children}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
