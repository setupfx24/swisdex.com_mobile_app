import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Text, Money, Pressable, Button, Divider } from '@/ui';
import { useTheme } from '@/theme';
import { useAccountsStore } from '@/stores/accountsStore';
import { portfolioApi, type TradeRow } from '@/lib/api/portfolio';
import { fmtLots } from '@/lib/format';
import { isCentAccount, fmtAccountMoney } from '@/lib/money';
import { safeFormat } from '@/lib/date';
import { buildStatementHtml } from '@/features/portfolio/buildStatementHtml';
import { ProfileHeader } from './profile';

type Scope = 'active' | 'all';
interface Period { key: string; label: string; months: number | null }

const PERIODS: Period[] = [
  { key: '1m', label: '1M', months: 1 },
  { key: '3m', label: '3M', months: 3 },
  { key: '6m', label: '6M', months: 6 },
  { key: '1y', label: '1Y', months: 12 },
  { key: 'all', label: 'All', months: null },
];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateFromFor(months: number | null): string | undefined {
  if (months == null) return undefined;
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return `${ymd(d)}T00:00:00`;
}

const periodLabelText: Record<string, string> = {
  '1m': 'Last 1 month', '3m': 'Last 3 months', '6m': 'Last 6 months', '1y': 'Last 1 year', all: 'All time',
};

export default function StatementScreen() {
  const theme = useTheme();
  const active = useAccountsStore((s) => s.active);

  const [scope, setScope] = useState<Scope>('active');
  const [period, setPeriod] = useState('1m');
  const [trades, setTrades] = useState<TradeRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const accountId = scope === 'active' ? active?.id : undefined;
  const accountLabel = scope === 'active'
    ? (active?.account_number ? `#${active.account_number}` : 'Active account')
    : 'All accounts';
  // Cent display only when scoped to a single cent account (all-accounts → USD).
  const cent = scope === 'active' && isCentAccount(active);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const p = PERIODS.find((x) => x.key === period);
      const date_from = dateFromFor(p?.months ?? null);
      const all: TradeRow[] = [];
      let page = 1;
      let pages = 1;
      do {
        const r = await portfolioApi.trades({ account_id: accountId, date_from, page, per_page: 50 });
        all.push(...(r.items ?? []));
        pages = Math.max(1, r.pages ?? 1);
        page += 1;
      } while (page <= pages && page <= 40);
      setTrades(all);
    } catch {
      setTrades([]);
      setMsg('Could not load trades.');
    } finally {
      setLoading(false);
    }
  }, [accountId, period]);

  useEffect(() => { void fetchTrades(); }, [fetchTrades]);

  const summary = useMemo(() => {
    const list = trades ?? [];
    return {
      pnl: list.reduce((a, t) => a + (Number(t.pnl) || 0), 0),
      commission: list.reduce((a, t) => a + (Number(t.commission) || 0), 0),
      swap: list.reduce((a, t) => a + (Number(t.swap) || 0), 0),
      lots: list.reduce((a, t) => a + (Number(t.lots) || 0), 0),
      count: list.length,
    };
  }, [trades]);

  const onDownload = async () => {
    if (!trades || trades.length === 0) { setMsg('No trades to include in the statement.'); return; }
    setGenerating(true);
    setMsg(null);
    try {
      const html = buildStatementHtml({
        accountLabel,
        periodLabel: periodLabelText[period] ?? period,
        generatedAt: safeFormat(new Date().toISOString(), 'MMM d, yyyy HH:mm'),
        trades,
        isCent: cent,
      });
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'SwisDex trade statement', UTI: 'com.adobe.pdf' });
      } else {
        setMsg(`Saved to ${uri}`);
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Could not create the PDF.');
    } finally {
      setGenerating(false);
    }
  };

  const card = {
    borderRadius: theme.radius.lg, backgroundColor: theme.colors.bg.secondary,
    borderWidth: 1, borderColor: theme.colors.border.primary, padding: theme.spacing[4],
  } as const;

  const chip = (selected: boolean) => ({
    paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.md,
    backgroundColor: selected ? theme.colors.buy : theme.colors.bg.tertiary,
    borderWidth: 1, borderColor: selected ? theme.colors.buy : theme.colors.border.primary,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Statement' }} />
      <ProfileHeader title="Statement / Reports" />
      <ScrollView contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[4] }}>
        <Text variant="bodyMd" tone="secondary">
          Generate a PDF statement of your closed trades — pick the account scope and period, then download or share.
        </Text>

        {/* Account scope */}
        <View style={{ gap: theme.spacing[2] }}>
          <Text variant="labelXs" tone="tertiary">ACCOUNT</Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
            {(['active', 'all'] as Scope[]).map((s) => (
              <Pressable key={s} haptic="light" onPress={() => setScope(s)} style={chip(scope === s)}>
                <Text variant="bodyMd" weight={scope === s ? 'bold' : 'regular'} style={{ color: scope === s ? '#FFFFFF' : theme.colors.text.primary }}>
                  {s === 'active' ? (active?.account_number ? `#${active.account_number}` : 'Active') : 'All accounts'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Period */}
        <View style={{ gap: theme.spacing[2] }}>
          <Text variant="labelXs" tone="tertiary">PERIOD</Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing[2], flexWrap: 'wrap' }}>
            {PERIODS.map((p) => (
              <Pressable key={p.key} haptic="light" onPress={() => setPeriod(p.key)} style={chip(period === p.key)}>
                <Text variant="bodyMd" weight={period === p.key ? 'bold' : 'regular'} style={{ color: period === p.key ? '#FFFFFF' : theme.colors.text.primary }}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Summary card */}
        <View style={card}>
          <Text variant="bodyMd" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>
            {periodLabelText[period]} · {accountLabel}
          </Text>
          {loading ? (
            <View style={{ paddingVertical: theme.spacing[4], alignItems: 'center' }}>
              <ActivityIndicator color={theme.colors.buy} />
            </View>
          ) : (
            <View style={{ gap: theme.spacing[2] }}>
              <Row label="Realized P&L"><Money value={summary.pnl} isCent={cent} pnl signed variant="numLg" /></Row>
              <Divider />
              <Row label="Closed trades"><Text variant="bodyMd" weight="medium">{summary.count}</Text></Row>
              <Row label="Volume"><Text variant="bodyMd" weight="medium">{fmtLots(summary.lots)} lots</Text></Row>
              <Row label="Commission"><Text variant="bodyMd" weight="medium">{fmtAccountMoney(summary.commission, cent)}</Text></Row>
              <Row label="Swap"><Text variant="bodyMd" weight="medium">{fmtAccountMoney(summary.swap, cent)}</Text></Row>
            </View>
          )}
        </View>

        <Button onPress={onDownload} loading={generating} disabled={loading || generating} size="lg">
          Download PDF statement
        </Button>

        {msg ? (
          <Text variant="body" tone={msg.startsWith('Saved') ? 'buy' : 'sell'}>{msg}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text variant="bodyMd" tone="tertiary">{label}</Text>
      {children}
    </View>
  );
}
