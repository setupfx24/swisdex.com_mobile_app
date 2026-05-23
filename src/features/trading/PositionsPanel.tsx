import { useEffect, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Text, Num, Divider, Pressable, Button } from '@/ui';
import { useTheme } from '@/theme';
import { useAccountsStore } from '@/stores/accountsStore';
import { useMarketDataStore } from '@/stores/marketDataStore';
import { usePositionsStore, bindPositionsToTicks } from '@/stores/positionsStore';
import { positionsApi } from '@/lib/api/positions';
import type { Position } from '@/types/trading';

interface Props {
  /** Show all positions on the active account, or filter to one symbol
   *  (e.g. only EURUSD positions on the Trade tab). */
  symbolFilter?: string;
  maxHeight?: number;
  onOpenPanic?: () => void;
}

export function PositionsPanel({ symbolFilter, maxHeight, onOpenPanic }: Props) {
  const theme = useTheme();
  const active = useAccountsStore((s) => s.active);
  const positions = usePositionsStore((s) => s.positions);
  const instruments = useMarketDataStore((s) => s.instruments);
  const load = usePositionsStore((s) => s.load);

  useEffect(() => {
    if (!active) return;
    void load(active.id);
    const unbind = bindPositionsToTicks();
    return unbind;
  }, [active, load]);

  const visible = symbolFilter
    ? positions.filter((p) => p.symbol === symbolFilter)
    : positions;

  const totalPnL = visible.reduce((sum, p) => sum + (p.profit ?? 0), 0);

  return (
    <View style={{ maxHeight, flex: maxHeight ? undefined : 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing[4],
          paddingVertical: theme.spacing[2],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[2] }}>
          <Text variant="label" tone="tertiary">
            OPEN ({visible.length})
          </Text>
          {visible.length > 0 ? <Num value={totalPnL} digits={2} pnl signed variant="num" /> : null}
        </View>
        {visible.length > 0 && onOpenPanic ? (
          <Pressable
            onPress={onOpenPanic}
            haptic="medium"
            style={({ pressed }) => ({
              paddingVertical: theme.spacing[1],
              paddingHorizontal: theme.spacing[3],
              borderRadius: theme.radius.md,
              backgroundColor: pressed ? theme.colors.sellBg : 'transparent',
              borderWidth: 1,
              borderColor: theme.colors.sell,
            })}
          >
            <Text variant="labelXs" tone="sell" weight="bold">CLOSE ALL</Text>
          </Pressable>
        ) : null}
      </View>
      <Divider />

      {visible.length === 0 ? (
        <View style={{ padding: theme.spacing[6] }}>
          <Text variant="bodyMd" tone="tertiary" align="center">No open positions.</Text>
        </View>
      ) : (
        <ScrollView>
          {visible.map((p) => (
            <View key={p.id}>
              <PositionRow position={p} instruments={instruments} />
              <Divider inset={theme.spacing[4]} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function PositionRow({ position, instruments }: { position: Position; instruments: { symbol: string; digits: number }[] }) {
  const theme = useTheme();
  const inst = instruments.find((i) => i.symbol === position.symbol);
  const digits = inst?.digits ?? 5;

  const onLongPress = () => {
    Alert.alert(
      `${position.side.toUpperCase()} ${position.lots} ${position.symbol}`,
      `Open ${position.open_price.toFixed(digits)} → ${position.current_price?.toFixed(digits) ?? '—'}`,
      [
        { text: 'Modify SL/TP', onPress: () => router.push({ pathname: '/(app)/position/[id]/modify', params: { id: position.id } }) },
        {
          text: 'Close',
          style: 'destructive',
          onPress: async () => {
            try {
              await positionsApi.close(position.id, {});
              usePositionsStore.getState().removePosition(position.id);
            } catch (e: unknown) {
              Alert.alert('Close failed', e instanceof Error ? e.message : 'Try again');
            }
          },
        },
        {
          text: 'Partial close',
          onPress: () => router.push({ pathname: '/(app)/position/[id]/close', params: { id: position.id } }),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={300}
      haptic="light"
      style={({ pressed }) => ({
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[2],
        backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
          <Text variant="bodyMd" weight="bold" tone={position.side === 'buy' ? 'buy' : 'sell'}>
            {position.side.toUpperCase()}
          </Text>
          <Text variant="bodyMd" weight="medium">{position.symbol}</Text>
          <Text variant="labelXs" tone="tertiary">{position.lots.toFixed(2)}</Text>
        </View>
        <Num value={position.profit} digits={2} pnl signed variant="num" />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[3], marginTop: 2 }}>
        <Text variant="labelXs" tone="tertiary">
          {position.open_price.toFixed(digits)} → {position.current_price?.toFixed(digits) ?? '—'}
        </Text>
        {position.stop_loss ? (
          <Text variant="labelXs" tone="tertiary">SL {position.stop_loss.toFixed(digits)}</Text>
        ) : null}
        {position.take_profit ? (
          <Text variant="labelXs" tone="tertiary">TP {position.take_profit.toFixed(digits)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
