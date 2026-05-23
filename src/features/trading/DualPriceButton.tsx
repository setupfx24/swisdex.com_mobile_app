import { View } from 'react-native';
import { Pressable, Text, Num } from '@/ui';
import { useTheme } from '@/theme';

interface DualPriceButtonProps {
  bid: number | undefined;
  ask: number | undefined;
  digits: number;
  /** Pip / fractional spread to render in the center chip. */
  spread?: number | string;
  onSell: () => void;
  onBuy: () => void;
  disabled?: boolean;
}

/** Vantage's signature trade-screen button: split SELL (red, left half)
 *  and BUY (green, right half) inside a single pill, with a small
 *  spread chip overlaid at the center. Both halves are 72pt tall. */
export function DualPriceButton({
  bid, ask, digits, spread, onSell, onBuy, disabled = false,
}: DualPriceButtonProps) {
  const theme = useTheme();
  const inactive = disabled || bid == null || ask == null;

  return (
    <View style={{ position: 'relative', height: 72 }}>
      <View
        style={{
          flexDirection: 'row',
          height: 72,
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <Pressable
          onPress={inactive ? undefined : onSell}
          haptic="medium"
          disabled={inactive}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: theme.colors.sell,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            paddingHorizontal: 24,
            opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
            gap: 2,
          })}
        >
          <Text variant="caption" style={{ color: '#FFFFFF', opacity: 0.9 }}>Sell</Text>
          <Num value={bid} digits={digits} variant="title2" style={{ color: '#FFFFFF' }} />
        </Pressable>

        <Pressable
          onPress={inactive ? undefined : onBuy}
          haptic="medium"
          disabled={inactive}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: theme.colors.buy,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            paddingHorizontal: 24,
            opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
            gap: 2,
          })}
        >
          <Text variant="caption" style={{ color: '#FFFFFF', opacity: 0.9 }}>Buy</Text>
          <Num value={ask} digits={digits} variant="title2" style={{ color: '#FFFFFF' }} />
        </Pressable>
      </View>

      {/* Spread chip overlay — sits centered over the seam between halves. */}
      {spread != null ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: [{ translateX: -22 }, { translateY: -12 }],
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor: '#1A1B1F',
          }}
        >
          <Text variant="captionB" tone="secondary">{spread}</Text>
        </View>
      ) : null}
    </View>
  );
}
