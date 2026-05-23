import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

/** Subtle shimmer placeholder. CLAUDE.md "Skeleton matching exact layout, NO
 *  spinners in middle of screen, NO 'Loading...' text. Shimmer subtle 1.5s
 *  cycle." Render at the same dimensions as the real content so the layout
 *  doesn't jump on first paint. */
export function Skeleton({ width = '100%', height = 14, radius, style }: SkeletonProps) {
  const theme = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.sm,
          backgroundColor: theme.colors.bg.tertiary,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Convenience grouping for a list of skeleton rows (e.g. portfolio row). */
export function SkeletonRow({ count = 6, gap = 12 }: { count?: number; gap?: number }) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Skeleton width={56} height={14} />
          <Skeleton width={88} height={14} />
          <View style={{ flex: 1 }} />
          <Skeleton width={64} height={14} />
        </View>
      ))}
    </View>
  );
}
