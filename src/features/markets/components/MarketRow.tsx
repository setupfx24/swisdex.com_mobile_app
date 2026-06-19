import { View } from 'react-native';
import { Text, Num, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { Sparkline } from '@/shared/components/Sparkline';
import { InstrumentIcon } from './InstrumentIcon';
import { useMarketDataStore } from '@/stores/marketDataStore';
import type { InstrumentInfo } from '@/types/market';

interface MarketRowProps {
  symbol: string;
  instrument?: InstrumentInfo;
  /** Optional sparkline data (last N closes). Pulled from chart cache. */
  sparkline?: number[];
  onPress?: () => void;
}

// Green-only theme: category chips use distinct GREEN shades instead of
// a rainbow of hues, so the app stays one green family.
const CATEGORY_COLORS: Record<string, string> = {
  metals: '#6bc93b',
  crypto: '#55a630',
  indices: '#3f7c24',
  forex: '#8BC34A',
  stocks: '#2E9D52',
  commodities: '#1E7A3C',
};

/** Vantage-style market row: icon | symbol+category chip | sparkline | price+change.
 *  Subtle bg tint based on direction; 1px divider rendered by the parent. */
export function MarketRow({ symbol, instrument, sparkline, onPress }: MarketRowProps) {
  const theme = useTheme();
  const price = useMarketDataStore((s) => s.prices[symbol]);
  const prev = useMarketDataStore((s) => s.prevBids[symbol]);
  const digits = instrument?.digits ?? 5;

  const change = price && prev ? price.bid - prev : 0;
  const changePct = price && prev && prev !== 0 ? (change / prev) * 100 : 0;
  const isUp = change >= 0;
  const segment = instrument?.segment ?? '';
  const catColor = CATEGORY_COLORS[segment.toLowerCase()] ?? theme.colors.text.secondary;

  return (
    <Pressable
      onPress={onPress}
      haptic="light"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[3],
        backgroundColor: pressed
          ? theme.colors.bg.hover
          : price
            ? (isUp ? theme.colors.bg.rowTintUp : theme.colors.bg.rowTintDown)
            : 'transparent',
        gap: theme.spacing[3],
        minHeight: 64,
      })}
    >
      {/* Instrument logo — flag pair (forex) / coin (crypto) / metal / code */}
      <InstrumentIcon symbol={symbol} segment={segment} size={36} />

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
          <Text variant="bodyLg" weight="medium" numberOfLines={1}>{symbol}</Text>
          {segment ? (
            <View
              style={{
                paddingHorizontal: 6, paddingVertical: 1,
                borderRadius: theme.radius.sm,
                backgroundColor: theme.colors.bg.chip,
              }}
            >
              <Text variant="labelXs" style={{ color: catColor, fontSize: 10 }}>
                {segment.toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>
        {instrument?.name ? (
          <Text variant="bodyMd" tone="secondary" numberOfLines={1}>{instrument.name}</Text>
        ) : null}
      </View>

      {sparkline && sparkline.length >= 2 ? (
        <Sparkline data={sparkline} width={56} height={24} />
      ) : null}

      <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
        <Num value={price?.bid} digits={digits} variant="bodyLg" />
        <Text variant="bodyMd" weight="semibold" tone={isUp ? 'buy' : 'sell'}>
          {price ? `${isUp ? '+' : ''}${changePct.toFixed(2)}%` : '—'}
        </Text>
      </View>
    </Pressable>
  );
}
