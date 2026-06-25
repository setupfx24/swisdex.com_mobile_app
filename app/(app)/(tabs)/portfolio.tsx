import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Search, MessageCircle } from 'lucide-react-native';
import { Text, Money, Pressable, Divider, Field, GradientBackground } from '@/ui';
import { useTheme } from '@/theme';
import { useAccountsStore } from '@/stores/accountsStore';
import { useMarketDataStore } from '@/stores/marketDataStore';
import { usePositionsStore, bindPositionsToTicks } from '@/stores/positionsStore';
import { positionsApi } from '@/lib/api/positions';
import { portfolioApi, type PortfolioSummary, type PortfolioPerformance, type PerfPeriod, type TradeRow } from '@/lib/api/portfolio';
import { buildDashboardFromPortfolio } from '@/features/portfolio/buildDashboard';
import { buildStatementHtml } from '@/features/portfolio/buildStatementHtml';
import { TradingJournal } from '@/features/portfolio/TradingJournal';
import { fmtLots } from '@/lib/format';
import { safeFormat } from '@/lib/date';
import { isCentAccount, fmtAccountMoney } from '@/lib/money';
import type { Position } from '@/types/trading';

type Tab = 'open' | 'closed';

const TIMEFRAMES: { label: string; period: PerfPeriod }[] = [
  { label: '1M', period: '1m' },
  { label: '3M', period: '3m' },
  { label: '6M', period: '6m' },
  { label: '1Y', period: '1y' },
  { label: 'All', period: 'all' },
  { label: 'Custom', period: 'custom' },
];

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Portfolio → Trading Journal (mirrors the web /portfolio module):
 *  timeframe selector, balance/equity, P&L stats, streak rings, trading
 *  calendar, equity growth, performance + crucial score, then positions. */
export default function PortfolioTab() {
  const theme = useTheme();
  const active = useAccountsStore((s) => s.active);
  const positions = usePositionsStore((s) => s.positions);
  const loadPositions = usePositionsStore((s) => s.load);
  const instruments = useMarketDataStore((s) => s.instruments);

  const [tab, setTab] = useState<Tab>('open');
  const [period, setPeriod] = useState<PerfPeriod>('1m');
  const [customFrom, setCustomFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return ymd(d); });
  const [customTo, setCustomTo] = useState(() => ymd(new Date()));
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [performance, setPerformance] = useState<PortfolioPerformance | null>(null);
  const [tradeRows, setTradeRows] = useState<TradeRow[]>([]);

  const isCent = isCentAccount(active);

  useEffect(() => {
    if (!active) return;
    void loadPositions(active.id);
    const unbind = bindPositionsToTicks();
    return unbind;
  }, [active, loadPositions]);

  const fetchJournal = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    // Custom range → scope performance + trades to the picked window (web parity).
    const dateParams = period === 'custom'
      ? { date_from: `${customFrom}T00:00:00`, date_to: `${customTo}T23:59:59` }
      : {};
    try {
      const [sum, perf, tr] = await Promise.all([
        portfolioApi.summary(active.id),
        portfolioApi.performance({ period, account_id: active.id, ...dateParams }),
        portfolioApi.trades({ account_id: active.id, page: 1, per_page: 200, ...dateParams }),
      ]);
      setSummary(sum);
      setPerformance(perf);
      setTradeRows(tr.items ?? []);
    } catch {
      // Leave previous data on screen; journal falls back to zeros below.
    } finally {
      setLoading(false);
    }
  }, [active, period, customFrom, customTo]);

  useEffect(() => { void fetchJournal(); }, [fetchJournal]);

  const dashboard = useMemo(() => {
    if (!summary) return null;
    const equity = Number(summary.total_equity) || 0;
    const usedMargin = active?.margin_used ?? 0;
    const freeMargin = active?.free_margin ?? Math.max(0, equity - usedMargin);
    const marginLevel = active?.margin_level && active.margin_level > 0 ? `${active.margin_level.toFixed(1)}%` : null;
    const periodPnl =
      period === 'custom' ? tradeRows.reduce((a, t) => a + (Number(t.pnl) || 0), 0) :
      period === 'all' ? summary.pnl_breakdown?.all_time ?? 0 :
      summary.pnl_breakdown?.this_month ?? 0;
    const openLots = (summary.holdings ?? []).reduce((a, h) => a + (Number(h.total_lots ?? h.lots) || 0), 0);
    return buildDashboardFromPortfolio({
      balance: Number(summary.total_balance) || 0,
      equity,
      credit: Number(summary.total_credit) || 0,
      allTimePnl: summary.pnl_breakdown?.all_time ?? 0,
      lotsFromOpenPositions: openLots,
      periodPnl,
      winRateFallback: performance?.stats?.win_rate ?? 0,
      sharpeRatio: performance?.stats?.sharpe_ratio ?? 0,
      trades: tradeRows,
      equityCurve: performance?.equity_curve ?? [],
      freeMargin,
      usedMargin,
      marginLevel,
      currency: active?.currency ?? 'USD',
    });
  }, [summary, performance, tradeRows, period, active]);

  const periodLabel = period === 'custom' ? `${customFrom} → ${customTo}`
    : (TIMEFRAMES.find((t) => t.period === period)?.label ?? period);

  // Download a PDF statement of the trades currently in view (web parity).
  const downloadPdf = useCallback(async () => {
    if (pdfBusy || tradeRows.length === 0) return;
    setPdfBusy(true);
    try {
      const html = buildStatementHtml({
        accountLabel: active?.account_number ? `#${active.account_number}` : 'Account',
        periodLabel,
        generatedAt: safeFormat(new Date().toISOString(), 'MMM d, yyyy HH:mm'),
        trades: tradeRows,
        isCent,
      });
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'SwisDex trade statement', UTI: 'com.adobe.pdf' });
      }
    } catch (e: unknown) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Could not create the PDF.');
    } finally {
      setPdfBusy(false);
    }
  }, [pdfBusy, tradeRows, active, periodLabel, isCent]);

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[2], paddingBottom: theme.spacing[2] }}>
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
          contentContainerStyle={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.hitTargets.tabBarBottom + theme.spacing[6] }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                if (active) await loadPositions(active.id);
                await fetchJournal();
                setRefreshing(false);
              }}
              tintColor={theme.colors.text.secondary}
            />
          }
        >
          {/* Timeframe selector */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 4, marginBottom: theme.spacing[2] }}>
            {TIMEFRAMES.map((t) => {
              const sel = period === t.period;
              return (
                <Pressable key={t.label} haptic="light" onPress={() => setPeriod(t.period)}
                  style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: theme.radius.sm, backgroundColor: sel ? theme.colors.buy : 'transparent' }}>
                  <Text variant="labelXs" weight={sel ? 'bold' : 'regular'} style={{ color: sel ? '#FFFFFF' : theme.colors.text.tertiary }}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Custom date range (web parity) — visible only for the Custom preset. */}
          {period === 'custom' ? (
            <View style={{ flexDirection: 'row', gap: theme.spacing[3], marginBottom: theme.spacing[4] }}>
              <View style={{ flex: 1 }}>
                <Field label="From (YYYY-MM-DD)" value={customFrom} onChangeText={setCustomFrom} placeholder="2026-05-01" autoCapitalize="none" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="To (YYYY-MM-DD)" value={customTo} onChangeText={setCustomTo} placeholder="2026-06-01" autoCapitalize="none" />
              </View>
            </View>
          ) : (
            <View style={{ height: theme.spacing[2] }} />
          )}

          {/* Trading Journal */}
          {dashboard ? (
            <TradingJournal data={dashboard} isCent={isCent} />
          ) : loading ? (
            <View style={{ paddingVertical: theme.spacing[10], alignItems: 'center' }}>
              <ActivityIndicator color={theme.colors.buy} />
            </View>
          ) : (
            <View style={{ paddingVertical: theme.spacing[10], alignItems: 'center' }}>
              <Text variant="bodyMd" tone="tertiary">Could not load portfolio.</Text>
            </View>
          )}

          {/* ——— Positions ——— */}
          <View style={{ height: theme.spacing[6] }} />
          <View style={{ flexDirection: 'row', gap: theme.spacing[5], paddingBottom: theme.spacing[3] }}>
            {([
              { k: 'open' as const, label: `Open positions (${positions.length})` },
              { k: 'closed' as const, label: 'Trade history' },
            ]).map((t) => {
              const selected = tab === t.k;
              return (
                <Pressable key={t.k} onPress={() => setTab(t.k)} haptic="light" style={{ paddingVertical: theme.spacing[1] }}>
                  <Text variant="bodyMd" weight={selected ? 'bold' : 'regular'} tone={selected ? 'primary' : 'secondary'}>{t.label}</Text>
                  {selected ? <View style={{ height: 2, backgroundColor: theme.colors.buy, marginTop: theme.spacing[1], borderRadius: 1 }} /> : null}
                </Pressable>
              );
            })}
          </View>
          <Divider />

          {tab === 'open' ? (
            positions.length === 0 ? (
              <EmptyPositions theme={theme} />
            ) : (
              positions.map((p) => (
                <View key={p.id}>
                  <PositionRow position={p} instruments={instruments} theme={theme} isCent={isCent} />
                  <Divider inset={theme.spacing[4]} />
                </View>
              ))
            )
          ) : (
            <View>
              {/* Download PDF statement (web parity) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing[2] }}>
                <Text variant="labelXs" tone="tertiary">{tradeRows.length} closed · {periodLabel}</Text>
                <Pressable haptic="light" onPress={downloadPdf} disabled={pdfBusy || tradeRows.length === 0}
                  style={{ paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[2], borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border.accent, backgroundColor: theme.colors.buyBg, opacity: pdfBusy || tradeRows.length === 0 ? 0.5 : 1 }}>
                  <Text variant="labelXs" weight="bold" tone="accent">{pdfBusy ? 'Generating…' : 'Download PDF'}</Text>
                </Pressable>
              </View>
              <Divider />
              {tradeRows.length === 0 ? (
                <EmptyPositions theme={theme} text="No closed trades in this period" />
              ) : (
                tradeRows.map((t) => (
                  <View key={t.id}>
                    <ClosedTradeRow trade={t} instruments={instruments} theme={theme} isCent={isCent} />
                    <Divider inset={theme.spacing[4]} />
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function EmptyPositions({ theme, text = 'No open positions' }: { theme: ReturnType<typeof useTheme>; text?: string }) {
  return (
    <View style={{ marginTop: theme.spacing[6], padding: theme.spacing[8], borderRadius: theme.radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.border.primary, alignItems: 'center' }}>
      <Text variant="bodyMd" tone="tertiary">{text}</Text>
    </View>
  );
}

/** A closed trade row in the Trade-history tab (web parity). */
function ClosedTradeRow({ trade, instruments, theme, isCent }: {
  trade: TradeRow;
  instruments: { symbol: string; digits: number }[];
  theme: ReturnType<typeof useTheme>;
  isCent: boolean;
}) {
  const digits = instruments.find((i) => i.symbol === trade.symbol)?.digits ?? 5;
  const isBuy = trade.side === 'buy';
  return (
    <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
          <Text variant="bodyMd" weight="bold" tone={isBuy ? 'buy' : 'sell'}>{trade.side.toUpperCase()}</Text>
          <Text variant="bodyMd" weight="medium">{trade.symbol}</Text>
          <Text variant="labelXs" tone="tertiary">{fmtLots(trade.lots)}</Text>
        </View>
        <Money value={trade.pnl} isCent={isCent} pnl signed variant="num" />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[3], marginTop: 2 }}>
        <Text variant="labelXs" tone="tertiary">
          {trade.open_price.toFixed(digits)} → {trade.close_price.toFixed(digits)}
        </Text>
        <Text variant="labelXs" tone="tertiary">{safeFormat(trade.close_time, 'MMM d HH:mm')}</Text>
        {trade.close_reason ? <Text variant="labelXs" tone="tertiary">{trade.close_reason.toUpperCase()}</Text> : null}
      </View>
    </View>
  );
}

const PositionRow = memo(function PositionRow({
  position, instruments, theme, isCent,
}: {
  position: Position;
  instruments: { symbol: string; digits: number }[];
  theme: ReturnType<typeof useTheme>;
  isCent?: boolean;
}) {
  const inst = instruments.find((i) => i.symbol === position.symbol);
  const digits = inst?.digits ?? 5;
  const isBuy = position.side === 'buy';
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

  // Tap CLOSE → confirmation popup with live P/L, then close on confirm.
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
          text: 'Close', style: 'destructive',
          onPress: async () => {
            try {
              await positionsApi.close(position.id, {});
              usePositionsStore.getState().removePosition(position.id);
            } catch (e: unknown) {
              Alert.alert('Close failed', e instanceof Error ? e.message : 'Try again');
            }
          },
        },
        { text: 'Partial close', onPress: () => router.push({ pathname: '/(app)/position/[id]/close', params: { id: position.id } }) },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  return (
    <Pressable onPress={showActions} onLongPress={showActions} delayLongPress={300} haptic="light"
      style={({ pressed }) => ({ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3], backgroundColor: pressed ? theme.colors.bg.hover : 'transparent', gap: 2 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
          <View style={{ paddingHorizontal: theme.spacing[2], paddingVertical: 2, borderRadius: theme.radius.sm, backgroundColor: isBuy ? theme.colors.buyBg : theme.colors.sellBg }}>
            <Text variant="labelXs" tone={isBuy ? 'buy' : 'sell'} weight="bold">{position.side.toUpperCase()}</Text>
          </View>
          <Text variant="bodyLg" weight="medium">{position.symbol}</Text>
          <Text variant="bodyMd" tone="secondary">{fmtLots(position.lots)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
          <Money value={position.profit} isCent={isCent} pnl signed variant="numLg" />
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
      <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
        <Text variant="bodyMd" tone="secondary">
          {position.open_price.toFixed(digits)} → {position.current_price?.toFixed(digits) ?? '—'}
        </Text>
        {position.stop_loss ? <Text variant="bodyMd" tone="secondary">SL {position.stop_loss.toFixed(digits)}</Text> : null}
        {position.take_profit ? <Text variant="bodyMd" tone="secondary">TP {position.take_profit.toFixed(digits)}</Text> : null}
      </View>
    </Pressable>
  );
});
