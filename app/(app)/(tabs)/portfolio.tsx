import { useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronDown, Filter, Search, MessageCircle } from 'lucide-react-native';
import { Text, Num, Pressable, Divider, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { useAccountsStore } from '@/stores/accountsStore';
import { useMarketDataStore } from '@/stores/marketDataStore';
import { usePositionsStore, bindPositionsToTicks } from '@/stores/positionsStore';
import { positionsApi } from '@/lib/api/positions';
import { portfolioApi } from '@/lib/api/portfolio';
import type { Position } from '@/types/trading';
import { EquityCurve } from '@/charts/EquityCurve';

type Tab = 'open' | 'pending' | 'closed';

/** Vantage-style Portfolio: equity summary card + tabbed positions list. */
export default function PortfolioTab() {
  const theme = useTheme();
  const active = useAccountsStore((s) => s.active);
  const positions = usePositionsStore((s) => s.positions);
  const pendingOrders = usePositionsStore((s) => s.pendingOrders);
  const loadPositions = usePositionsStore((s) => s.load);
  const instruments = useMarketDataStore((s) => s.instruments);

  const [tab, setTab] = useState<Tab>('open');
  const [refreshing, setRefreshing] = useState(false);
  const [equityCurve, setEquityCurve] = useState<{ t: string | number; v: number }[] | null>(null);

  useEffect(() => {
    if (!active) return;
    void loadPositions(active.id);
    const unbind = bindPositionsToTicks();
    return unbind;
  }, [active, loadPositions]);

  useEffect(() => {
    portfolioApi.performance('30d')
      .then((p) => setEquityCurve(p?.equity_curve ?? null))
      .catch(() => setEquityCurve(null));
  }, []);

  const totalPnL = positions.reduce((s, p) => s + (p.profit ?? 0), 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: theme.spacing[4],
          paddingTop: theme.spacing[2], paddingBottom: theme.spacing[2],
        }}
      >
        <Text variant="h1">Portfolio</Text>
        <View style={{ flex: 1 }} />
        <Pressable haptic="light" onPress={() => router.push('/instruments')} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Search size={22} color={theme.colors.text.primary} strokeWidth={1.75} />
        </Pressable>
        <Pressable haptic="light" onPress={() => router.push('/inbox')} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <MessageCircle size={22} color={theme.colors.text.primary} strokeWidth={1.75} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.hitTargets.tabBarBottom + theme.spacing[6] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              if (active) await loadPositions(active.id);
              setRefreshing(false);
            }}
            tintColor={theme.colors.text.secondary}
          />
        }
      >
        {/* Equity summary card */}
        <View
          style={{
            marginHorizontal: theme.spacing[4],
            marginBottom: theme.spacing[4],
            padding: theme.spacing[5],
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.bg.secondary,
            gap: theme.spacing[3],
          }}
        >
          <View>
            <Text variant="labelXs" tone="secondary">EQUITY</Text>
            <View style={{ height: theme.spacing[1] }} />
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[2] }}>
              <Num value={active?.equity ?? 0} digits={2} variant="numXxl" />
              <Text variant="bodyMd" tone="secondary">{active?.currency ?? 'USD'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], marginTop: 2 }}>
              <Num value={totalPnL} digits={2} pnl signed variant="bodyMd" />
              <Text variant="bodyMd" tone="secondary">unrealized</Text>
            </View>
          </View>
          <Divider />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <StatCell label="Balance" value={active?.balance ?? 0} />
            <StatCell label="Margin" value={active?.margin_used ?? 0} />
            <StatCell label="Free" value={active?.free_margin ?? 0} />
            <StatCell label="Level" value={active?.margin_level ?? 0} suffix="%" />
          </View>
        </View>

        {/* Equity curve */}
        {equityCurve && equityCurve.length > 1 ? (
          <View style={{ marginHorizontal: theme.spacing[4], marginBottom: theme.spacing[4] }}>
            <Text variant="labelXs" tone="secondary" style={{ marginBottom: theme.spacing[2] }}>30D EQUITY</Text>
            <EquityCurve points={equityCurve} height={120} />
          </View>
        ) : null}

        {/* Tabs */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: theme.spacing[4],
            gap: theme.spacing[5],
            paddingBottom: theme.spacing[3],
          }}
        >
          {([
            { k: 'open' as const, label: `Open (${positions.length})` },
            { k: 'pending' as const, label: `Pending (${pendingOrders.length})` },
            { k: 'closed' as const, label: 'Closed' },
          ]).map((t) => {
            const selected = tab === t.k;
            return (
              <Pressable
                key={t.k}
                onPress={() => setTab(t.k)}
                haptic="light"
                style={{ paddingVertical: theme.spacing[1] }}
              >
                <Text variant="bodyMd" weight={selected ? 'bold' : 'regular'} tone={selected ? 'primary' : 'secondary'}>
                  {t.label}
                </Text>
                {selected ? (
                  <View
                    style={{
                      height: 2,
                      backgroundColor: theme.colors.buy,
                      marginTop: theme.spacing[1],
                      borderRadius: 1,
                    }}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <Divider />

        {/* List */}
        {tab === 'open' ? (
          positions.length === 0 ? (
            <EmptyPositions theme={theme} />
          ) : (
            positions.map((p) => (
              <View key={p.id}>
                <PositionRow position={p} instruments={instruments} theme={theme} />
                <Divider inset={theme.spacing[4]} />
              </View>
            ))
          )
        ) : tab === 'pending' ? (
          pendingOrders.length === 0 ? (
            <EmptyPositions theme={theme} text="No pending orders" />
          ) : (
            pendingOrders.map((o) => (
              <View key={o.id} style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
                <Text variant="bodyMd" weight="medium">{o.side.toUpperCase()} {o.symbol} @ {o.price}</Text>
                <Text variant="bodyMd" tone="secondary">{o.order_type.toUpperCase()} · {o.lots} lots</Text>
              </View>
            ))
          )
        ) : (
          <Pressable
            haptic="light"
            onPress={() => router.push('/portfolio-history')}
            style={{
              marginHorizontal: theme.spacing[4],
              marginTop: theme.spacing[3],
              padding: theme.spacing[4],
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.bg.secondary,
              alignItems: 'center',
            }}
          >
            <Text variant="bodyMd" tone="accent" weight="semibold">Open full trade history →</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCell({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <View>
      <Text variant="labelXs" tone="secondary">{label}</Text>
      <Num value={value} digits={2} suffix={suffix} variant="numLg" />
    </View>
  );
}

function EmptyPositions({ theme, text = 'No open positions' }: { theme: ReturnType<typeof useTheme>; text?: string }) {
  return (
    <View
      style={{
        marginHorizontal: theme.spacing[4],
        marginTop: theme.spacing[6],
        padding: theme.spacing[8],
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme.colors.border.primary,
        alignItems: 'center',
      }}
    >
      <Text variant="bodyMd" tone="tertiary">{text}</Text>
    </View>
  );
}

function PositionRow({
  position, instruments, theme,
}: {
  position: Position;
  instruments: { symbol: string; digits: number }[];
  theme: ReturnType<typeof useTheme>;
}) {
  const inst = instruments.find((i) => i.symbol === position.symbol);
  const digits = inst?.digits ?? 5;
  const isBuy = position.side === 'buy';

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
        paddingVertical: theme.spacing[3],
        backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
        gap: 2,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
          <View
            style={{
              paddingHorizontal: theme.spacing[2], paddingVertical: 2,
              borderRadius: theme.radius.sm,
              backgroundColor: isBuy ? theme.colors.buyBg : theme.colors.sellBg,
            }}
          >
            <Text variant="labelXs" tone={isBuy ? 'buy' : 'sell'} weight="bold">
              {position.side.toUpperCase()}
            </Text>
          </View>
          <Text variant="bodyLg" weight="medium">{position.symbol}</Text>
          <Text variant="bodyMd" tone="secondary">{position.lots.toFixed(2)}</Text>
        </View>
        <Num value={position.profit} digits={2} pnl signed variant="numLg" />
      </View>
      <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
        <Text variant="bodyMd" tone="secondary">
          {position.open_price.toFixed(digits)} → {position.current_price?.toFixed(digits) ?? '—'}
        </Text>
        {position.stop_loss ? (
          <Text variant="bodyMd" tone="secondary">SL {position.stop_loss.toFixed(digits)}</Text>
        ) : null}
        {position.take_profit ? (
          <Text variant="bodyMd" tone="secondary">TP {position.take_profit.toFixed(digits)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
