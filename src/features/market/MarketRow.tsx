import { useMemo } from 'react';
import { View } from 'react-native';
import { useMarketDataStore } from '@/stores/marketDataStore';
import { Pressable, Text, Num } from '@/ui';
import { useTheme } from '@/theme';
import { Sparkline } from '@/shared/components/Sparkline';
import type { InstrumentInfo } from '@/types/market';

interface Props {
  symbol: string;
  instrument?: InstrumentInfo;
  /** Render a 60-80px inline sparkline between subtitle and price. */
  showSparkline?: boolean;
  sparklineData?: number[];
  onPress?: () => void;
}

// Map instrument segments to category chip colors. Mirrors Vantage's
// category palette (forex purple, crypto orange, etc.).
const SEGMENT_COLORS: Record<string, string> = {
  forex: '#A78BFA',
  metals: '#F59E0B',
  crypto: '#FB923C',
  indices: '#60A5FA',
  stocks: '#22D3EE',
  commodities: '#94A3B8',
};

/** Vantage-style watchlist / explore row. Dense 64pt height with 32px
 *  symbol icon, code + category chip, optional inline sparkline, and
 *  right-aligned price + change %. */
export function MarketRow({ symbol, instrument, showSparkline = false, sparklineData, onPress }: Props) {
  const theme = useTheme();
  const price = useMarketDataStore((s) => s.prices[symbol]);
  const prev = useMarketDataStore((s) => s.prevBids[symbol]);
  const digits = instrument?.digits ?? 5;

  const segment = (instrument?.segment ?? '').toLowerCase();
  const chipColor = SEGMENT_COLORS[segment] ?? theme.colors.text.tertiary;

  const change = useMemo(() => {
    if (!price || prev == null || prev === 0) return null;
    const abs = price.bid - prev;
    const pct = (abs / prev) * 100;
    return { abs, pct, positive: abs >= 0 };
  }, [price, prev]);

  // 1st char of symbol as a placeholder for the icon — real currency
  // flags / crypto logos are a Phase-followup.
  const iconLetter = symbol.slice(0, 1);

  return (
    <Pressable
      onPress={onPress}
      haptic="light"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 64,
        backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
      })}
    >
      <View
        style={{
          width: 32, height: 32, borderRadius: 999,
          backgroundColor: theme.colors.bg.tertiary,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text variant="bodyB" tone="primary" style={{ fontSize: 14 }}>{iconLetter}</Text>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="bodyM" tone="primary">{symbol}</Text>
          {segment ? (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 4,
                backgroundColor: theme.colors.bg.chip,
              }}
            >
              <Text variant="caption" style={{ color: chipColor, fontSize: 10, fontWeight: '600', textTransform: 'capitalize' }}>
                {segment}
              </Text>
            </View>
          ) : null}
        </View>
        {instrument?.name ? (
          <Text variant="bodyR" tone="secondary" numberOfLines={1}>{instrument.name}</Text>
        ) : null}
      </View>

      {showSparkline && sparklineData && sparklineData.length >= 2 ? (
        <View style={{ width: 72, alignItems: 'center', justifyContent: 'center' }}>
          <Sparkline data={sparklineData} width={72} height={28} />
        </View>
      ) : null}

      <View style={{ alignItems: 'flex-end', minWidth: 80, gap: 2 }}>
        {price ? (
          <>
            <Num value={price.bid} digits={digits} variant="bodyB" tone="primary" />
            {change ? (
              <Num
                value={change.pct}
                digits={2}
                signed
                suffix="%"
                variant="bodyB"
                tone={change.positive ? 'buy' : 'sell'}
              />
            ) : null}
          </>
        ) : (
          <Num value={null} digits={digits} variant="bodyB" tone="secondary" />
        )}
      </View>
    </Pressable>
  );
}
