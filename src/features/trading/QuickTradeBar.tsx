import { useState } from 'react';
import { View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Text, Num, Pressable, Button } from '@/ui';
import { useTheme } from '@/theme';
import { useMarketDataStore } from '@/stores/marketDataStore';
import { useAccountsStore } from '@/stores/accountsStore';
import { placeOrder } from './orderClient';

interface Props {
  symbol: string;
  digits: number;
  marketOpen: boolean;
  onError: (msg: string) => void;
}

/** MT5-style bottom quick-trade bar matching the web trader's mobile
 *  branch (swisdesk/frontend/trader/src/app/trading/terminal/page.tsx:524-589).
 *  56pt SELL / lot stepper / 56pt BUY. */
export function QuickTradeBar({ symbol, digits, marketOpen, onError }: Props) {
  const theme = useTheme();
  const tick = useMarketDataStore((s) => s.prices[symbol]);
  const active = useAccountsStore((s) => s.active);
  const [lots, setLots] = useState('0.01');

  const bump = (delta: number) => {
    const cur = parseFloat(lots) || 0;
    const next = Math.max(0.01, +(cur + delta).toFixed(2));
    setLots(next.toFixed(2));
  };

  const submit = async (side: 'buy' | 'sell') => {
    if (!marketOpen) return onError('Market is closed.');
    if (!active) return onError('No account selected.');
    const lotsNum = parseFloat(lots);
    if (!Number.isFinite(lotsNum) || lotsNum <= 0) return onError('Invalid lot size.');
    try {
      await placeOrder(
        { account_id: active.id, symbol, side, order_type: 'market', lots: lotsNum },
        { optimistic: true },
      );
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : 'Order failed.');
    }
  };

  return (
    <View
      style={{
        paddingHorizontal: theme.spacing[3],
        paddingTop: theme.spacing[2],
        paddingBottom: theme.spacing[3],
        backgroundColor: theme.colors.bg.secondary,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border.primary,
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: theme.spacing[2],
      }}
    >
      <Pressable
        onPress={() => submit('sell')}
        haptic="medium"
        disabled={!marketOpen || !tick}
        style={({ pressed }) => ({
          flex: 1,
          height: theme.hitTargets.buyButton,
          backgroundColor: theme.colors.sell,
          borderRadius: theme.radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: !marketOpen || !tick ? 0.5 : pressed ? 0.85 : 1,
        })}
      >
        <Text variant="bodyMd" weight="bold" style={{ color: '#fff', letterSpacing: 1 }}>SELL</Text>
        <Num value={tick?.bid} digits={digits} variant="labelXs" tone="inverse" />
      </Pressable>

      <View style={{ alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <Text variant="labelXs" tone="tertiary">LOTS</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Pressable
            onPress={() => bump(-0.01)}
            haptic="light"
            style={({ pressed }) => ({
              width: 32, height: 32,
              borderRadius: theme.radius.md,
              backgroundColor: pressed ? theme.colors.bg.active : theme.colors.bg.primary,
              borderWidth: 1, borderColor: theme.colors.border.primary,
              alignItems: 'center', justifyContent: 'center',
            })}
          >
            <Minus size={14} color={theme.colors.text.primary} strokeWidth={2.5} />
          </Pressable>
          <View
            style={{
              width: 60, height: 32,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.bg.primary,
              borderWidth: 1, borderColor: theme.colors.border.primary,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text variant="bodyMd" weight="bold">{lots}</Text>
          </View>
          <Pressable
            onPress={() => bump(0.01)}
            haptic="light"
            style={({ pressed }) => ({
              width: 32, height: 32,
              borderRadius: theme.radius.md,
              backgroundColor: pressed ? theme.colors.bg.active : theme.colors.bg.primary,
              borderWidth: 1, borderColor: theme.colors.border.primary,
              alignItems: 'center', justifyContent: 'center',
            })}
          >
            <Plus size={14} color={theme.colors.text.primary} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={() => submit('buy')}
        haptic="medium"
        disabled={!marketOpen || !tick}
        style={({ pressed }) => ({
          flex: 1,
          height: theme.hitTargets.buyButton,
          backgroundColor: theme.colors.buy,
          borderRadius: theme.radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: !marketOpen || !tick ? 0.5 : pressed ? 0.85 : 1,
        })}
      >
        <Text variant="bodyMd" weight="bold" style={{ color: '#fff', letterSpacing: 1 }}>BUY</Text>
        <Num value={tick?.ask} digits={digits} variant="labelXs" tone="inverse" />
      </Pressable>
    </View>
  );
}
