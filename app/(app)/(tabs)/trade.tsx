import { useState, useEffect, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronDown, MoreVertical, BarChart2, Bell, Minus, Plus, Info,
} from 'lucide-react-native';
import { Text, Num, Pressable, Divider, Button } from '@/ui';
import { useTheme } from '@/theme';
import { ProfileCompleteGate } from '@/features/auth/ProfileCompleteGate';
import { useMarketDataStore } from '@/stores/marketDataStore';
import { useAccountsStore } from '@/stores/accountsStore';
import { usePositionsStore } from '@/stores/positionsStore';
import { priceSocket } from '@/lib/ws/priceSocket';
import { tradeSocket } from '@/lib/ws/tradeSocket';
import { startWebSocketLifecycle } from '@/lib/ws/appStateLifecycle';
import { DualPriceButton } from '@/features/trading/components/DualPriceButton';
import { placeOrder } from '@/features/trading/orderClient';

/** Vantage-style Trade terminal: account pill, symbol selector,
 *  signature dual buy/sell pill, volume stepper, info rows, big CTA. */
export default function TradeTab() {
  const theme = useTheme();
  const symbol = useMarketDataStore((s) => s.selectedSymbol);
  const instruments = useMarketDataStore((s) => s.instruments);
  const tick = useMarketDataStore((s) => s.prices[symbol]);
  const updateTick = useMarketDataStore((s) => s.updateTick);
  const active = useAccountsStore((s) => s.active);
  const positions = usePositionsStore((s) => s.positions);
  const loadPositions = usePositionsStore((s) => s.load);

  const [lots, setLots] = useState('0.01');
  const [side, setSide] = useState<'buy' | 'sell' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const instrument = useMemo(
    () => instruments.find((i) => i.symbol === symbol),
    [instruments, symbol],
  );
  const digits = instrument?.digits ?? 5;

  useEffect(() => {
    startWebSocketLifecycle();
    const unsub = priceSocket.subscribe(updateTick);
    priceSocket.connect();
    return unsub;
  }, [updateTick]);

  useEffect(() => {
    if (!active) return;
    void tradeSocket.connect(active.id);
    void loadPositions(active.id);
  }, [active, loadPositions]);

  const bump = (delta: number) => {
    const cur = parseFloat(lots) || 0;
    const next = Math.max(0.01, +(cur + delta).toFixed(2));
    setLots(next.toFixed(2));
  };

  const submit = async (dir: 'buy' | 'sell') => {
    if (!active) return setToast('No account selected.');
    const lotsNum = parseFloat(lots);
    if (!Number.isFinite(lotsNum) || lotsNum <= 0) return setToast('Invalid lot size.');
    setSide(dir);
    try {
      await placeOrder(
        { account_id: active.id, symbol, side: dir, order_type: 'market', lots: lotsNum },
        { optimistic: true },
      );
      setToast(`${dir.toUpperCase()} ${lots} ${symbol}`);
      setTimeout(() => setToast(null), 1_500);
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : 'Order failed');
      setTimeout(() => setToast(null), 3_000);
    } finally {
      setSide(null);
    }
  };

  const equity = active?.equity ?? 0;
  const leverage = active?.leverage ?? 100;

  const margin = useMemo(() => {
    const lotsNum = parseFloat(lots) || 0;
    const cs = instrument?.contract_size ?? 100_000;
    const price = tick?.ask ?? tick?.bid ?? 0;
    if (!price || !cs) return 0;
    return (lotsNum * cs * price) / leverage;
  }, [lots, instrument, tick, leverage]);

  const freeMargin = Math.max(0, equity - margin);
  const marginLevelAfter = margin > 0 ? (equity / margin) * 100 : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <ProfileCompleteGate />

      {/* Top: CFDs / Copy toggle + 3-dot */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: theme.spacing[4],
          paddingTop: theme.spacing[2], paddingBottom: theme.spacing[2],
          gap: theme.spacing[2],
        }}
      >
        <View style={{ flexDirection: 'row', gap: theme.spacing[4] }}>
          <Text variant="bodyLg" weight="bold">CFDs</Text>
          <Pressable haptic="light" onPress={() => router.push('/earn/copy')}>
            <Text variant="bodyLg" tone="secondary">Copy</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1 }} />
        <Pressable haptic="light" onPress={() => {}} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={20} color={theme.colors.text.primary} strokeWidth={1.75} />
        </Pressable>
        <Pressable haptic="light" onPress={() => router.push('/accounts')} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <MoreVertical size={20} color={theme.colors.text.primary} strokeWidth={1.75} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing[4],
          paddingBottom: theme.hitTargets.tabBarBottom + theme.spacing[6],
          gap: theme.spacing[4],
        }}
      >
        {/* Account pill + equity */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            haptic="light"
            onPress={() => router.push('/accounts')}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center',
              gap: theme.spacing[2],
              paddingVertical: theme.spacing[2],
              paddingHorizontal: theme.spacing[3],
              borderRadius: theme.radius.pill,
              backgroundColor: pressed ? theme.colors.bg.hover : theme.colors.bg.chip,
            })}
          >
            {active?.is_demo ? (
              <View
                style={{
                  paddingHorizontal: theme.spacing[2], paddingVertical: 2,
                  borderRadius: theme.radius.sm,
                  backgroundColor: 'rgba(167,139,250,0.18)',
                }}
              >
                <Text variant="labelXs" style={{ color: '#A78BFA', fontSize: 10 }}>DEMO</Text>
              </View>
            ) : null}
            <Text variant="bodyMd" weight="medium">
              {active ? `#${active.account_number}` : 'Pick account'}
            </Text>
            <ChevronDown size={14} color={theme.colors.text.secondary} />
          </Pressable>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="labelXs" tone="secondary">Equity USD</Text>
            <Num value={equity} digits={2} variant="num" />
          </View>
        </View>

        {/* Symbol selector */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            haptic="light"
            onPress={() => router.push('/instruments')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1] }}
          >
            <Text variant="h1">{symbol}</Text>
            <ChevronDown size={20} color={theme.colors.text.primary} />
          </Pressable>
          <Pressable
            haptic="light"
            onPress={() => {}}
            style={{
              width: 40, height: 40,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.bg.secondary,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <BarChart2 size={20} color={theme.colors.text.primary} strokeWidth={1.75} />
          </Pressable>
        </View>

        {/* DUAL PRICE BUTTON */}
        <DualPriceButton
          bid={tick?.bid}
          ask={tick?.ask}
          digits={digits}
          onSell={() => submit('sell')}
          onBuy={() => submit('buy')}
          disabled={side !== null || !tick}
        />

        {/* Order type */}
        <View
          style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[3],
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.bg.secondary,
            gap: theme.spacing[1],
          }}
        >
          <Text variant="bodyMd" weight="medium">Market</Text>
          <ChevronDown size={14} color={theme.colors.text.secondary} />
          <View style={{ flex: 1 }} />
          <Text variant="bodyMd" tone="tertiary">Fill at market price</Text>
        </View>

        {/* Volume stepper */}
        <View
          style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[3],
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.bg.secondary,
            gap: theme.spacing[3],
          }}
        >
          <Pressable
            haptic="light"
            onPress={() => bump(-0.01)}
            style={{
              width: 36, height: 36,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.bg.chip,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Minus size={16} color={theme.colors.text.primary} strokeWidth={2.5} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text variant="numLg">{lots}</Text>
          </View>
          <Pressable
            haptic="light"
            onPress={() => bump(0.01)}
            style={{
              width: 36, height: 36,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.bg.chip,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Plus size={16} color={theme.colors.text.primary} strokeWidth={2.5} />
          </Pressable>
          <Pressable
            haptic="light"
            onPress={() => {}}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1] }}
          >
            <Text variant="bodyMd" weight="medium">Lots</Text>
            <ChevronDown size={14} color={theme.colors.text.secondary} />
          </Pressable>
        </View>

        {/* Info rows */}
        <View
          style={{
            padding: theme.spacing[4],
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.bg.secondary,
            gap: theme.spacing[3],
          }}
        >
          <InfoRow theme={theme} label="Margin Required" value={`$${margin.toFixed(2)} USD`} />
          <InfoRow theme={theme} label="Free Margin" value={`$${freeMargin.toFixed(2)} USD`} />
          <InfoRow
            theme={theme}
            label="Margin Level After"
            value={marginLevelAfter > 0 ? `${marginLevelAfter.toFixed(2)}%` : '—'}
          />
          <InfoRow theme={theme} label="Leverage" value={`1:${leverage}`} />
        </View>

        {/* Big CTA — defaults to BUY accent */}
        <Button
          variant="buy"
          size="xl"
          onPress={() => submit('buy')}
          loading={side === 'buy'}
          disabled={!tick || side === 'sell'}
        >
          Buy {symbol}
        </Button>

        {/* Positions strip */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: theme.spacing[4],
          }}
        >
          <View style={{ flexDirection: 'row', gap: theme.spacing[4] }}>
            <Text variant="bodyMd" weight="bold">Positions ({positions.length})</Text>
            <Text variant="bodyMd" tone="secondary">Pending (0)</Text>
          </View>
          {positions.length > 0 ? (
            <Pressable haptic="medium" onPress={() => router.push('/(app)/(tabs)/portfolio')}>
              <Text variant="bodyMd" tone="sell" weight="semibold">Close All</Text>
            </Pressable>
          ) : null}
        </View>
        {positions.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: theme.spacing[6] }}>
            <Info size={32} color={theme.colors.text.tertiary} strokeWidth={1.5} />
            <View style={{ height: theme.spacing[2] }} />
            <Text variant="bodyMd" tone="tertiary">No open positions</Text>
          </View>
        ) : null}
      </ScrollView>

      {toast ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: theme.hitTargets.tabBarBottom + theme.spacing[3],
            left: theme.spacing[4],
            right: theme.spacing[4],
            padding: theme.spacing[3],
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.bg.secondary,
            borderWidth: 1,
            borderColor: theme.colors.border.primary,
          }}
        >
          <Text variant="bodyMd" align="center">{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function InfoRow({ theme, label, value }: { theme: ReturnType<typeof useTheme>; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text variant="bodyMd" tone="secondary">{label}</Text>
      <Text variant="bodyMd" weight="medium">{value}</Text>
    </View>
  );
}
