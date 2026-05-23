import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Num, Divider } from '@/ui';
import { useTheme } from '@/theme';
import { ActiveAccountBadge } from '@/features/accounts/ActiveAccountBadge';
import { ProfileCompleteGate } from '@/features/auth/ProfileCompleteGate';
import { useMarketDataStore } from '@/stores/marketDataStore';
import { priceSocket } from '@/lib/ws/priceSocket';
import { startWebSocketLifecycle } from '@/lib/ws/appStateLifecycle';
import { TimeframePills, TimeframeBar } from '@/charts/TimeframePills';
import { CandleChart } from '@/charts/CandleChart';
import { useCandles } from '@/charts/useCandles';
import { timeframeFor } from '@/charts/timeframes';
import type { Timeframe } from '@/charts/types';

export default function TradeTab() {
  const theme = useTheme();
  const symbol = useMarketDataStore((s) => s.selectedSymbol);
  const instruments = useMarketDataStore((s) => s.instruments);
  const tick = useMarketDataStore((s) => s.prices[symbol]);
  const prevBid = useMarketDataStore((s) => s.prevBids[symbol]);
  const updateTick = useMarketDataStore((s) => s.updateTick);

  const [tf, setTf] = useState<Timeframe>('5m');
  const tfMeta = timeframeFor(tf);
  const { candles, loading, error } = useCandles(symbol, tfMeta);

  const instrument = instruments.find((i) => i.symbol === symbol);
  const digits = instrument?.digits ?? 5;

  useEffect(() => {
    startWebSocketLifecycle();
    const unsub = priceSocket.subscribe(updateTick);
    priceSocket.connect();
    return unsub;
  }, [updateTick]);

  const changeAbs = tick && prevBid ? tick.bid - prevBid : 0;
  const changePct = tick && prevBid && prevBid !== 0 ? (changeAbs / prevBid) * 100 : 0;

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
          <Text variant="h2">{symbol}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[2] }}>
            <Num value={tick?.bid} digits={digits} variant="bodyLg" />
            {tick ? (
              <Num
                value={changeAbs}
                digits={digits}
                pnl
                signed
                variant="body"
              />
            ) : null}
            {tick ? (
              <Num value={changePct} digits={2} pnl signed suffix="%" variant="body" />
            ) : null}
          </View>
        </View>
        <ActiveAccountBadge variant="compact" />
      </View>

      <TimeframeBar>
        <TimeframePills value={tf} onChange={setTf} />
      </TimeframeBar>

      <View style={{ flex: 1 }}>
        {loading && candles.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={theme.colors.text.secondary} />
          </View>
        ) : error ? (
          <View style={{ padding: theme.spacing[4] }}>
            <Text variant="bodyMd" tone="sell">{error}</Text>
          </View>
        ) : candles.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="bodyMd" tone="tertiary">No bars for {symbol} on {tfMeta.label}.</Text>
          </View>
        ) : (
          <CandleChart candles={candles} digits={digits} />
        )}
      </View>

      <Divider />
      <View
        style={{
          paddingHorizontal: theme.spacing[4],
          paddingVertical: theme.spacing[3],
        }}
      >
        <Text variant="labelXs" tone="tertiary" align="center">
          Quick-trade bar + order entry sheet arrive in Phase 8.
        </Text>
      </View>
    </SafeAreaView>
  );
}
