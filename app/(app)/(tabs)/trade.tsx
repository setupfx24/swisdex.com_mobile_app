import { useState, useEffect } from 'react';
import { View, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sliders } from 'lucide-react-native';
import { Text, Num, Divider, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { ActiveAccountBadge } from '@/features/accounts/ActiveAccountBadge';
import { ProfileCompleteGate } from '@/features/auth/ProfileCompleteGate';
import { useMarketDataStore } from '@/stores/marketDataStore';
import { priceSocket } from '@/lib/ws/priceSocket';
import { tradeSocket } from '@/lib/ws/tradeSocket';
import { startWebSocketLifecycle } from '@/lib/ws/appStateLifecycle';
import { useAccountsStore } from '@/stores/accountsStore';
import { usePositionsStore } from '@/stores/positionsStore';
import { TimeframePills, TimeframeBar } from '@/charts/TimeframePills';
import { CandleChart } from '@/charts/CandleChart';
import { useCandles } from '@/charts/useCandles';
import { timeframeFor } from '@/charts/timeframes';
import type { Timeframe } from '@/charts/types';
import { QuickTradeBar } from '@/features/trading/QuickTradeBar';
import { OrderSheet } from '@/features/trading/OrderSheet';
import { PositionsPanel } from '@/features/trading/PositionsPanel';
import { PanicCloseSheet } from '@/features/trading/PanicCloseSheet';

export default function TradeTab() {
  const theme = useTheme();
  const symbol = useMarketDataStore((s) => s.selectedSymbol);
  const instruments = useMarketDataStore((s) => s.instruments);
  const tick = useMarketDataStore((s) => s.prices[symbol]);
  const prevBid = useMarketDataStore((s) => s.prevBids[symbol]);
  const updateTick = useMarketDataStore((s) => s.updateTick);
  const active = useAccountsStore((s) => s.active);
  const loadPositions = usePositionsStore((s) => s.load);

  const [tf, setTf] = useState<Timeframe>('5m');
  const tfMeta = timeframeFor(tf);
  const { candles, loading, error } = useCandles(symbol, tfMeta);
  const [orderSheet, setOrderSheet] = useState(false);
  const [panicSheet, setPanicSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const instrument = instruments.find((i) => i.symbol === symbol);
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
    const unsub = tradeSocket.subscribe((event) => {
      // Any trade event for this account → re-sync positions.
      if (event.type === 'order_filled' || event.type === 'position_closed' || event.type === 'balance_update') {
        void loadPositions(active.id);
      }
    });
    return unsub;
  }, [active, loadPositions]);

  const changeAbs = tick && prevBid ? tick.bid - prevBid : 0;
  const changePct = tick && prevBid && prevBid !== 0 ? (changeAbs / prevBid) * 100 : 0;
  const marketOpen = true; // TODO(phase-8-followup): drive from instrumentsApi.marketStatus

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <ProfileCompleteGate />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing[4],
          paddingTop: theme.spacing[2],
          paddingBottom: theme.spacing[2],
        }}
      >
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[2] }}>
            <Text variant="h2">{symbol}</Text>
            <Num value={tick?.bid} digits={digits} variant="bodyLg" />
          </View>
          {tick ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[2] }}>
              <Num value={changeAbs} digits={digits} pnl signed variant="body" />
              <Num value={changePct} digits={2} pnl signed suffix="%" variant="body" />
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
          <Pressable
            onPress={() => setOrderSheet(true)}
            haptic="light"
            style={({ pressed }) => ({
              width: 40, height: 40,
              borderRadius: theme.radius.lg,
              backgroundColor: pressed ? theme.colors.bg.active : theme.colors.bg.secondary,
              borderWidth: 1, borderColor: theme.colors.border.primary,
              alignItems: 'center', justifyContent: 'center',
            })}
          >
            <Sliders size={18} color={theme.colors.text.primary} strokeWidth={1.75} />
          </Pressable>
          <ActiveAccountBadge variant="compact" />
        </View>
      </View>

      <TimeframeBar>
        <TimeframePills value={tf} onChange={setTf} />
      </TimeframeBar>

      <View style={{ flex: 1, minHeight: 220 }}>
        {loading && candles.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={theme.colors.text.secondary} />
          </View>
        ) : error ? (
          <View style={{ padding: theme.spacing[4] }}>
            <Text variant="bodyMd" tone="sell">{error}</Text>
          </View>
        ) : (
          <CandleChart candles={candles} digits={digits} />
        )}
      </View>

      <View style={{ maxHeight: 220 }}>
        <PositionsPanel symbolFilter={undefined} maxHeight={220} onOpenPanic={() => setPanicSheet(true)} />
      </View>

      {toast ? (
        <View
          style={{
            position: 'absolute',
            bottom: 92,
            left: theme.spacing[4],
            right: theme.spacing[4],
            padding: theme.spacing[3],
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.sellBg,
            borderWidth: 1, borderColor: theme.colors.sell,
          }}
        >
          <Text variant="body" tone="sell">{toast}</Text>
        </View>
      ) : null}

      <QuickTradeBar
        symbol={symbol}
        digits={digits}
        marketOpen={marketOpen}
        onError={(msg) => {
          setToast(msg);
          setTimeout(() => setToast(null), 3_000);
        }}
      />

      <OrderSheet
        visible={orderSheet}
        onClose={() => setOrderSheet(false)}
        symbol={symbol}
        digits={digits}
        initialSide="buy"
        initialPrice={tick?.bid}
      />
      <PanicCloseSheet
        visible={panicSheet}
        onClose={() => setPanicSheet(false)}
      />
    </SafeAreaView>
  );
}
