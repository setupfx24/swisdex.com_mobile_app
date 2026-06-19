import { forwardRef, useState, type ReactNode } from 'react';
import {
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';

export interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  invalid?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  /** Optional trailing element inside the field (e.g. a password eye toggle). */
  rightSlot?: ReactNode;
}

/** Themed single-line input. Highlights focus and invalid states via border
 *  colour — no shadow, no scale — to fit CLAUDE.md's dense + flat aesthetic.
 *  Forwarded ref so callers can imperatively focus (e.g. autofocus the
 *  TOTP input the moment the 2FA prompt opens). */
export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  { invalid = false, containerStyle, rightSlot, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = invalid
    ? theme.colors.sell
    : focused
      ? theme.colors.buy
      : theme.colors.border.primary;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.bg.input,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor,
        },
        containerStyle,
      ]}
    >
      <RNTextInput
        ref={ref}
        {...rest}
        placeholderTextColor={theme.colors.text.tertiary}
        selectionColor={theme.colors.buy}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={{
          flex: 1,
          height: theme.hitTargets.min,
          paddingHorizontal: theme.spacing[3],
          color: theme.colors.text.primary,
          fontSize: theme.sizes.md,
          fontWeight: theme.weights.regular,
        }}
      />
      {rightSlot ? (
        <View style={{ paddingRight: theme.spacing[2] }}>{rightSlot}</View>
      ) : null}
    </View>
  );
});
