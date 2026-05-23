import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { Num } from '@/ui';
import { useTheme } from '@/theme';

interface Props {
  value: number | undefined;
  prevValue?: number;
  digits: number;
  /** 'bid' (left, sell-side) or 'ask' (right, buy-side). Tints the
   *  background flash when the price moves UP for buy / DOWN for sell. */
  side?: 'bid' | 'ask';
}

/** Price cell with the CLAUDE.md "100ms flash on background on tick
 *  update" treatment. Compares current to prev: flash buy-green when
 *  it goes the user's way, sell-red when it goes against them. */
export function PriceCell({ value, prevValue, digits, side = 'bid' }: Props) {
  const theme = useTheme();
  const bg = useSharedValue<string>('transparent');
  const lastFlash = useRef<number | null>(null);

  useEffect(() => {
    if (value == null || prevValue == null) return;
    if (value === prevValue) return;
    if (lastFlash.current === value) return;
    lastFlash.current = value;
    const going = value > prevValue ? 'up' : 'down';
    // For 'ask' (right column / buy price), up=good=green flash.
    // For 'bid' (left column / sell price), up=good=green flash too — the
    // user benefits from higher prices on either side. Down is red.
    const flash = going === 'up' ? theme.colors.buyGlow : theme.colors.sellGlow;
    bg.value = withSequence(
      withTiming(flash, { duration: 0 }),
      withTiming('transparent', { duration: 280 }),
    );
  }, [value, prevValue, bg, theme.colors.buyGlow, theme.colors.sellGlow]);

  const animatedStyle = useAnimatedStyle(() => ({ backgroundColor: bg.value }));

  return (
    <Animated.View
      style={[
        {
          paddingHorizontal: theme.spacing[2],
          paddingVertical: 2,
          borderRadius: theme.radius.sm,
        },
        animatedStyle,
      ]}
    >
      <Num value={value} digits={digits} tone={side === 'ask' ? 'buy' : 'sell'} variant="num" />
    </Animated.View>
  );
}

/** Drop-in baseline for empty rows so the layout doesn't jitter when a
 *  symbol hasn't received its first tick. */
export function PriceCellPlaceholder() {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: theme.spacing[2], paddingVertical: 2 }}>
      <Num value={null} digits={2} variant="num" />
    </View>
  );
}
