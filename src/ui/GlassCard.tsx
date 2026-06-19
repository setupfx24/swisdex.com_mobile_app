import type { ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Real frosted-glass blur (heavier — use only on signature surfaces).
   *  Default false → cheap translucent fill, which still reads as glass over
   *  the gradient backdrop. Blur only applies in dark mode. */
  blur?: boolean;
  /** Corner radius. Defaults to theme.radius.xl (24). */
  radius?: number;
  /** Inner padding shortcut. */
  padding?: number;
}

/** Translucent, rounded "glass" surface with a soft green-tinted border and
 *  drop shadow. Replaces flat bg.secondary cards on signature screens. */
export function GlassCard({ children, style, blur = false, radius, padding }: Props) {
  const theme = useTheme();
  const r = radius ?? theme.radius.xl;

  const shell: ViewStyle = {
    borderRadius: r,
    borderWidth: 1,
    borderColor: theme.colors.bg.glassBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: theme.scheme === 'dark' ? 0.35 : 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    ...(padding != null ? { padding } : {}),
  };

  if (blur && theme.scheme === 'dark') {
    return (
      <View style={[shell, style]}>
        <BlurView intensity={26} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.bg.glass }]} />
        {children}
      </View>
    );
  }

  return (
    <View style={[shell, { backgroundColor: theme.colors.bg.glass }, style]}>
      {children}
    </View>
  );
}
