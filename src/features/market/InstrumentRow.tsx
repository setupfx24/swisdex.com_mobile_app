import { View } from 'react-native';
import { useMarketDataStore } from '@/stores/marketDataStore';
import { useTheme } from '@/theme';
import { Pressable, Text } from '@/ui';
import { PriceCell, PriceCellPlaceholder } from './PriceCell';
import type { InstrumentInfo } from '@/types/market';

interface Props {
  symbol: string;
  instrument?: InstrumentInfo;
  onPress?: () => void;
}

/** Single row in the watchlist / instruments table. Three columns:
 *  symbol (+ segment subtitle), bid, ask. Dense — CLAUDE.md "MetaTrader 5
 *  mobile, Kite" density target. */
export function InstrumentRow({ symbol, instrument, onPress }: Props) {
  const theme = useTheme();
  const price = useMarketDataStore((s) => s.prices[symbol]);
  const prev = useMarketDataStore((s) => s.prevBids[symbol]);
  const digits = instrument?.digits ?? 5;

  return (
    <Pressable
      onPress={onPress}
      haptic="light"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[2],
        backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
        gap: theme.spacing[3],
      })}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyMd" weight="medium" numberOfLines={1}>{symbol}</Text>
        {instrument ? (
          <Text variant="labelXs" tone="tertiary">{instrument.segment}</Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {price ? <PriceCell value={price.bid} prevValue={prev} digits={digits} side="bid" /> : <PriceCellPlaceholder />}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {price ? <PriceCell value={price.ask} prevValue={prev} digits={digits} side="ask" /> : <PriceCellPlaceholder />}
      </View>
    </Pressable>
  );
}
