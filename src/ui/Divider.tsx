import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface DividerProps {
  /** "horizontal" = 1px tall row separator (default), "vertical" = 1px wide. */
  orientation?: 'horizontal' | 'vertical';
  /** Left-padding so the divider hangs under the row content, not the avatar. */
  inset?: number;
  /** Override the default border-primary colour (use sparingly). */
  color?: string;
  style?: ViewStyle;
}

/** Hairline divider used everywhere a row separator is needed.
 *  CLAUDE.md design rule: "1px horizontal dividers for separation, cards ONLY
 *  when tappable or has elevation meaning." Default to the divider. */
export function Divider({ orientation = 'horizontal', inset = 0, color, style }: DividerProps) {
  const theme = useTheme();
  const c = color ?? theme.colors.border.primary;
  if (orientation === 'vertical') {
    return <View style={[{ width: 1, backgroundColor: c, alignSelf: 'stretch' }, style]} />;
  }
  return (
    <View
      style={[
        { height: 1, backgroundColor: c, marginLeft: inset },
        style,
      ]}
    />
  );
}
