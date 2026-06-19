import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { Text, Money, Divider, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { useAccountsStore } from '@/stores/accountsStore';
import { useMarketDataStore } from '@/stores/marketDataStore';
import { usePositionsStore, bindPositionsToTicks } from '@/stores/positionsStore';
import { positionsApi } from '@/lib/api/positions';
import { ordersApi } from '@/lib/api/orders';
import { portfolioApi, type TradeRow } from '@/lib/api/portfolio';
import { fmtLots } from '@/lib/format';
import { isCentAccount, fmtAccountMoney } from '@/lib/money';
import type { Position, OrderResponse } from '@/types/trading';

type Tab = 'open' | 'pending' | 'closed';

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
  const isCent = isCentAccount(active);
  const positions = usePositionsStore((s) => s.positions);
  const instruments = useMarketDataStore((s) => s.instruments);
  const load = usePositionsStore((s) => s.load);

  const [tab, setTab] = useState<Tab>('open');
  const [pending, setPending] = useState<OrderResponse[] | null>(null);
  // Closed trades come from trade history (/portfolio/trades), NOT the
  // positions table — once a position closes it's moved to history.
  const [closed, setClosed] = useState<TradeRow[] | null>(null);
  const [closedPage, setClosedPage] = useState(1);
  const [closedPages, setClosedPages] = useState(1);
  const [closedTotal, setClosedTotal] = useState(0);
  const [loadingMoreClosed, setLoadingMoreClosed] = useState(false);

  // Open positions stay live via the ticks binding.
  useEffect(() => {
    if (!active) return;
    void load(active.id);
    const unbind = bindPositionsToTicks();
    return unbind;
  }, [active, load]);

  const refreshPending = useCallback(() => {
    if (!active) return;
    ordersApi.list(active.id, 'pending').then(setPending).catch(() => setPending([]));
  }, [active]);
  const refreshClosed = useCallback(() => {
    if (!active) return;
    portfolioApi.trades({ account_id: active.id, page: 1, per_page: 50 })
      .then((r) => {
        setClosed(r.items ?? []);
        setClosedPage(r.page ?? 1);
        setClosedPages(r.pages ?? 1);
        setClosedTotal(r.total ?? (r.items?.length ?? 0));
      })
      .catch(() => { setClosed([]); setClosedPages(1); setClosedTotal(0); });
  }, [active]);

  // Append the next page of closed history.
  const loadMoreClosed = useCallback(async () => {
    if (!active || loadingMoreClosed || closedPage >= closedPages) return;
    setLoadingMoreClosed(true);
    try {
      const r = await portfolioApi.trades({ account_id: active.id, page: closedPage + 1, per_page: 50 });
      setClosed((prev) => [...(prev ?? []), ...(r.items ?? [])]);
      setClosedPage(r.page ?? closedPage + 1);
      setClosedPages(r.pages ?? closedPages);
    } finally {
      setLoadingMoreClosed(false);
    }
  }, [active, loadingMoreClosed, closedPage, closedPages]);

  // Lazy-load each tab the first time it's opened; refetch on account change.
  useEffect(() => { setPending(null); setClosed(null); setClosedPage(1); setClosedPages(1); setClosedTotal(0); }, [active?.id]);
  useEffect(() => {
    if (tab === 'pending' && pending === null) refreshPending();
    if (tab === 'closed' && closed === null) refreshClosed();
  }, [tab, pending, closed, refreshPending, refreshClosed]);

  const bySymbol = <T extends { symbol: string }>(arr: T[]) =>
    symbolFilter ? arr.filter((x) => x.symbol === symbolFilter) : arr;

  const openList = bySymbol(positions);
  const pendingList = bySymbol(pending ?? []);
  // Closed = full account history (NOT symbol-scoped) so the user sees every
  // closed trade, paginated via "Load more".
  const closedList = closed ?? [];
  const totalPnL = openList.reduce((sum, p) => sum + (p.profit ?? 0), 0);

  const TABS: { key: Tab; label: string; count: number | null }[] = [
    { key: 'open', label: 'Open', count: openList.length },
    { key: 'pending', label: 'Pending', count: pending === null ? null : pendingList.length },
    { key: 'closed', label: 'Closed', count: closed === null ? null : closedTotal },
  ];

  const cancelOrder = (o: OrderResponse) => {
    Alert.alert(
      `Cancel ${o.order_type.replace('_', '-')} order`,
      `${o.side.toUpperCase()} ${o.lots} ${o.symbol} @ ${o.price}`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel order',
          style: 'destructive',
          onPress: async () => {
            try {
              await ordersApi.cancel(o.id);
              setPending((prev) => (prev ?? []).filter((x) => x.id !== o.id));
            } catch (e: unknown) {
              Alert.alert('Cancel failed', e instanceof Error ? e.message : 'Try again');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ maxHeight, flex: maxHeight ? undefined : 1 }}>
      {/* Tab bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing[4],
          paddingVertical: theme.spacing[2],
        }}
      >
        <View style={{ flexDirection: 'row', gap: theme.spacing[4] }}>
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <Pressable key={t.key} onPress={() => setTab(t.key)} haptic="light" hitSlop={6}>
                <Text variant="label" tone={on ? 'accent' : 'tertiary'} weight={on ? 'bold' : 'regular'}>
                  {t.label}{t.count !== null ? ` (${t.count})` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {tab === 'open' && openList.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
            <Money value={totalPnL} isCent={isCent} pnl signed variant="num" />
            {onOpenPanic ? (
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
        ) : null}
      </View>
      <Divider />

      {/* OPEN */}
      {tab === 'open' ? (
        openList.length === 0 ? (
          <Empty theme={theme} text="No open positions." />
        ) : (
          <ScrollView>
            {openList.map((p) => (
              <View key={p.id}>
                <PositionRow position={p} instruments={instruments} isCent={isCent} />
                <Divider inset={theme.spacing[4]} />
              </View>
            ))}
          </ScrollView>
        )
      ) : null}

      {/* PENDING */}
      {tab === 'pending' ? (
        pending === null ? (
          <Empty theme={theme} text="Loading…" />
        ) : pendingList.length === 0 ? (
          <Empty theme={theme} text="No pending orders." />
        ) : (
          <ScrollView>
            {pendingList.map((o) => (
              <View key={o.id}>
                <OrderRow order={o} instruments={instruments} onCancel={() => cancelOrder(o)} />
                <Divider inset={theme.spacing[4]} />
              </View>
            ))}
          </ScrollView>
        )
      ) : null}

      {/* CLOSED */}
      {tab === 'closed' ? (
        closed === null ? (
          <Empty theme={theme} text="Loading…" />
        ) : closedList.length === 0 ? (
          <Empty theme={theme} text="No closed trades." />
        ) : (
          <ScrollView>
            {closedList.map((t) => (
              <View key={t.id}>
                <ClosedRow trade={t} instruments={instruments} isCent={isCent} />
                <Divider inset={theme.spacing[4]} />
              </View>
            ))}
            {closedPage < closedPages ? (
              <Pressable
                onPress={loadMoreClosed}
                haptic="light"
                disabled={loadingMoreClosed}
                style={({ pressed }) => ({
                  margin: theme.spacing[3],
                  paddingVertical: theme.spacing[3],
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border.primary,
                  backgroundColor: pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                  alignItems: 'center',
                })}
              >
                <Text variant="bodyMd" weight="bold" tone="accent">
                  {loadingMoreClosed ? 'Loading…' : `Load more (${closedTotal - closedList.length} left)`}
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        )
      ) : null}
    </View>
  );
}

function Empty({ theme, text }: { theme: ReturnType<typeof useTheme>; text: string }) {
  return (
    <View style={{ padding: theme.spacing[6] }}>
      <Text variant="bodyMd" tone="tertiary" align="center">{text}</Text>
    </View>
  );
}

type Inst = { symbol: string; digits: number };

function PositionRow({ position, instruments, isCent }: { position: Position; instruments: Inst[]; isCent?: boolean }) {
  const theme = useTheme();
  const digits = instruments.find((i) => i.symbol === position.symbol)?.digits ?? 5;
  const [closing, setClosing] = useState(false);

  const doClose = async () => {
    if (closing) return;
    setClosing(true);
    try {
      await positionsApi.close(position.id, {});
      usePositionsStore.getState().removePosition(position.id);
    } catch (e: unknown) {
      Alert.alert('Close failed', e instanceof Error ? e.message : 'Try again');
      setClosing(false);
    }
  };

  // Tap CLOSE → confirmation popup showing the live P/L, then close on confirm.
  const confirmClose = () => {
    if (closing) return;
    const pnl = fmtAccountMoney(position.profit ?? 0, !!isCent, { signDisplay: 'always' });
    const cur = position.current_price?.toFixed(digits) ?? '—';
    Alert.alert(
      `Close ${position.side.toUpperCase()} ${fmtLots(position.lots)} ${position.symbol}`,
      `Live P/L: ${pnl}\n${position.open_price.toFixed(digits)} → ${cur}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm close', style: 'destructive', onPress: () => { void doClose(); } },
      ],
    );
  };

  const showActions = () => {
    Alert.alert(
      `${position.side.toUpperCase()} ${position.lots} ${position.symbol}`,
      `Open ${position.open_price.toFixed(digits)} → ${position.current_price?.toFixed(digits) ?? '—'}`,
      [
        { text: 'Set / modify SL · TP', onPress: () => router.push({ pathname: '/(app)/position/[id]/modify', params: { id: position.id } }) },
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
      onPress={showActions}
      onLongPress={showActions}
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
          <Text variant="labelXs" tone="tertiary">{fmtLots(position.lots)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
          <Money value={position.profit} isCent={isCent} pnl signed variant="num" />
          <Pressable
            haptic="medium"
            onPress={confirmClose}
            disabled={closing}
            hitSlop={6}
            style={{
              paddingHorizontal: theme.spacing[2], paddingVertical: 4,
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.sellBg,
              borderWidth: 1, borderColor: '#FF2D55',
              opacity: closing ? 0.5 : 1,
            }}
          >
            <Text variant="labelXs" weight="bold" style={{ color: '#FF2D55' }}>{closing ? '…' : 'CLOSE'}</Text>
          </Pressable>
        </View>
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

function OrderRow({ order, instruments, onCancel }: { order: OrderResponse; instruments: Inst[]; onCancel: () => void }) {
  const theme = useTheme();
  const digits = instruments.find((i) => i.symbol === order.symbol)?.digits ?? 5;

  const onLongPress = () => {
    Alert.alert(
      `${order.order_type.replace('_', '-').toUpperCase()} · ${order.side.toUpperCase()} ${order.lots} ${order.symbol}`,
      `Trigger @ ${order.price.toFixed(digits)}`,
      [
        { text: 'Modify', onPress: () => router.push({ pathname: '/(app)/position/[id]/modify', params: { id: order.id } }) },
        { text: 'Cancel order', style: 'destructive', onPress: onCancel },
        { text: 'Close', style: 'cancel' },
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
          <Text variant="bodyMd" weight="bold" tone={order.side === 'buy' ? 'buy' : 'sell'}>
            {order.side.toUpperCase()}
          </Text>
          <Text variant="bodyMd" weight="medium">{order.symbol}</Text>
          <Text variant="labelXs" tone="tertiary">{fmtLots(order.lots)}</Text>
        </View>
        <View
          style={{
            paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.radius.sm,
            backgroundColor: theme.colors.bg.chip,
          }}
        >
          <Text variant="caption" weight="bold" tone="warning">{order.order_type.replace('_', '-').toUpperCase()}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[3], marginTop: 2 }}>
        <Text variant="labelXs" tone="tertiary">Trigger {order.price.toFixed(digits)}</Text>
        {order.stop_loss ? <Text variant="labelXs" tone="tertiary">SL {order.stop_loss.toFixed(digits)}</Text> : null}
        {order.take_profit ? <Text variant="labelXs" tone="tertiary">TP {order.take_profit.toFixed(digits)}</Text> : null}
        <Text variant="labelXs" tone="tertiary">{format(new Date(order.created_at), 'MMM d HH:mm')}</Text>
      </View>
    </Pressable>
  );
}

function ClosedRow({ trade, instruments, isCent }: { trade: TradeRow; instruments: Inst[]; isCent?: boolean }) {
  const theme = useTheme();
  const digits = instruments.find((i) => i.symbol === trade.symbol)?.digits ?? 5;
  const closedAt = trade.close_time ? new Date(trade.close_time) : null;

  return (
    <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
          <Text variant="bodyMd" weight="bold" tone={trade.side === 'buy' ? 'buy' : 'sell'}>
            {trade.side.toUpperCase()}
          </Text>
          <Text variant="bodyMd" weight="medium">{trade.symbol}</Text>
          <Text variant="labelXs" tone="tertiary">{fmtLots(trade.lots)}</Text>
        </View>
        <Money value={trade.pnl} isCent={isCent} pnl signed variant="num" />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[3], marginTop: 2 }}>
        <Text variant="labelXs" tone="tertiary">
          {trade.open_price.toFixed(digits)} → {trade.close_price.toFixed(digits)}
        </Text>
        {closedAt && !Number.isNaN(closedAt.getTime()) ? (
          <Text variant="labelXs" tone="tertiary">{format(closedAt, 'MMM d HH:mm')}</Text>
        ) : null}
      </View>
    </View>
  );
}
