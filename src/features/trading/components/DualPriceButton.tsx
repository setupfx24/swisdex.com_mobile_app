import { View } from 'react-native';
import { Text, Num, Pressable } from '@/ui';
import { useTheme } from '@/theme';

interface Props {
  bid?: number;
  ask?: number;
  digits: number;
  spreadPips?: number;
  disabled?: boolean;
  onSell: () => void;
  onBuy: () => void;
}

/** Vantage's iconic SELL | spread | BUY pill. Two-half horizontal pill with
 *  a small spread chip overlapping in the middle.
 *  - Left half RED, right half GREEN (SwisDex green replaces Vantage's grey).
 *  - Spread chip rides centred over the seam. */
export function DualPriceButton({ bid, ask, digits, spreadPips, disabled, onSell, onBuy }: Props) {
  const theme = useTheme();
  const spread = spreadPips ?? (bid && ask ? Math.abs(ask - bid) * Math.pow(10, digits - 1) : 0);

  return (
    <View style={{ position: 'relative', height: 72 }}>
      <View style={{ flexDirection: 'row', height: '100%', gap: 2 }}>
        <Pressable
          onPress={disabled ? undefined : onSell}
          haptic="medium"
          disabled={disabled}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: disabled ? theme.colors.bg.tertiary : pressed ? theme.colors.sellDark : theme.colors.sell,
            borderTopLeftRadius: theme.radius.pill,
            borderBottomLeftRadius: theme.radius.pill,
            paddingVertical: theme.spacing[3],
            paddingHorizontal: theme.spacing[5],
            justifyContent: 'center',
            alignItems: 'flex-start',
            opacity: disabled ? 0.5 : 1,
          })}
        >
          <Text variant="label" style={{ color: '#FFFFFF', opacity: 0.85 }}>Sell</Text>
          <Num value={bid} digits={digits} variant="numXl" tone="inverse" style={{ color: '#FFFFFF' }} />
        </Pressable>
        <Pressable
          onPress={disabled ? undefined : onBuy}
          haptic="medium"
          disabled={disabled}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: disabled ? theme.colors.bg.tertiary : pressed ? theme.colors.buyDark : theme.colors.buy,
            borderTopRightRadius: theme.radius.pill,
            borderBottomRightRadius: theme.radius.pill,
            paddingVertical: theme.spacing[3],
            paddingHorizontal: theme.spacing[5],
            justifyContent: 'center',
            alignItems: 'flex-end',
            opacity: disabled ? 0.5 : 1,
          })}
        >
          <Text variant="label" style={{ color: '#FFFFFF', opacity: 0.85 }}>Buy</Text>
          <Num value={ask} digits={digits} variant="numXl" tone="inverse" style={{ color: '#FFFFFF' }} />
        </Pressable>
      </View>

      {/* Spread chip — absolutely centred, overlaps both halves */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0, bottom: 0, left: 0, right: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: '#0A0B0F',
            paddingHorizontal: theme.spacing[2],
            paddingVertical: theme.spacing[1],
            borderRadius: theme.radius.sm,
            borderWidth: 1,
            borderColor: theme.colors.border.primary,
          }}
        >
          <Text variant="labelXs" tone="secondary" weight="semibold">
            {spread > 0 ? spread.toFixed(1) : '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}
