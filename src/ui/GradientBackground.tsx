import type { ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';

/** Full-screen backdrop. Dark mode renders the deep green→black gradient;
 *  light mode renders a flat fill (gradient stops are the same colour). Place
 *  as the outer container of a screen with children sitting on top. */
export function GradientBackground({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const stops = theme.colors.gradient.screen;
  return (
    <View style={[{ flex: 1, backgroundColor: theme.colors.bg.base }, style]}>
      <LinearGradient
        colors={stops as readonly [string, string, ...string[]]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}
