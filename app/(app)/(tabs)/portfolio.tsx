import { useEffect, useState } from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text, Num, Divider, Pressable, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { ActiveAccountBadge } from '@/features/accounts/ActiveAccountBadge';
import { EquityCurve } from '@/charts/EquityCurve';
import { portfolioApi, type PortfolioSummary, type PortfolioPerformance } from '@/lib/api/portfolio';

const WINDOWS = ['7d', '30d', '90d', '1y'] as const;
type Window = typeof WINDOWS[number];

export default function PortfolioTab() {
  const theme = useTheme();
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [perf, setPerf] = useState<PortfolioPerformance | null>(null);
  const [window, setWindow] = useState<Window>('30d');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [s, p] = await Promise.all([
      portfolioApi.summary().catch(() => null),
      portfolioApi.performance(window).catch(() => null),
    ]);
    setSummary(s);
    setPerf(p);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [window]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
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
        <Text variant="h2">Portfolio</Text>
        <ActiveAccountBadge variant="compact" />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing[12] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            tintColor={theme.colors.text.secondary}
          />
        }
      >
        <View style={{ paddingHorizontal: theme.spacing[4] }}>
          {summary ? (
            <>
              <Text variant="label" tone="tertiary">TOTAL EQUITY</Text>
              <Num value={summary.total_equity} digits={2} variant="numXxl" />
              <View style={{ flexDirection: 'row', gap: theme.spacing[3], marginTop: theme.spacing[1] }}>
                <Num value={summary.total_unrealized_pnl} digits={2} pnl signed variant="bodyLg" />
                <Text variant="body" tone="tertiary">
                  · {summary.total_open_positions} open · {summary.accounts_count} accounts
                </Text>
              </View>
            </>
          ) : (
            <SkeletonRow count={2} />
          )}
        </View>

        <View style={{ height: theme.spacing[3] }} />

        <View style={{ flexDirection: 'row', gap: theme.spacing[2], paddingHorizontal: theme.spacing[4] }}>
          {WINDOWS.map((w) => {
            const selected = w === window;
            return (
              <Pressable
                key={w}
                onPress={() => setWindow(w)}
                haptic="light"
                style={({ pressed }) => ({
                  paddingVertical: theme.spacing[1],
                  paddingHorizontal: theme.spacing[3],
                  borderRadius: theme.radius.md,
                  backgroundColor: selected ? theme.colors.buy : pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                  borderWidth: 1,
                  borderColor: selected ? theme.colors.buy : theme.colors.border.primary,
                })}
              >
                <Text variant="labelXs" tone={selected ? 'inverse' : 'secondary'} weight={selected ? 'bold' : 'medium'}>
                  {w.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: theme.spacing[3] }} />

        <View style={{ paddingHorizontal: theme.spacing[2] }}>
          {perf?.equity_curve && perf.equity_curve.length > 1 ? (
            <EquityCurve points={perf.equity_curve} height={180} />
          ) : (
            <View style={{ height: 180, alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="body" tone="tertiary">{perf ? 'Not enough data for a curve yet.' : 'Loading…'}</Text>
            </View>
          )}
        </View>

        <Divider />

        {perf ? (
          <View style={{ padding: theme.spacing[4] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Stat label="P&L" value={perf.pnl} pnl />
              <Stat label="Win rate" value={perf.win_rate * 100} suffix="%" />
              <Stat label="Trades" value={perf.total_trades} digits={0} />
            </View>
          </View>
        ) : null}

        <Divider />

        <Pressable
          onPress={() => router.push('/portfolio-history')}
          haptic="light"
          style={({ pressed }) => ({
            paddingHorizontal: theme.spacing[4],
            paddingVertical: theme.spacing[3],
            backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          })}
        >
          <Text variant="bodyMd" weight="medium">Trade history</Text>
          <Text variant="body" tone="tertiary">View all →</Text>
        </Pressable>
        <Divider />

        <Pressable
          onPress={() => router.push('/portfolio-export')}
          haptic="light"
          style={({ pressed }) => ({
            paddingHorizontal: theme.spacing[4],
            paddingVertical: theme.spacing[3],
            backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          })}
        >
          <Text variant="bodyMd" weight="medium">Export CSV / JSON</Text>
          <Text variant="body" tone="tertiary">→</Text>
        </Pressable>
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({
  label,
  value,
  pnl,
  digits = 2,
  suffix,
}: {
  label: string;
  value: number;
  pnl?: boolean;
  digits?: number;
  suffix?: string;
}) {
  return (
    <View>
      <Text variant="labelXs" tone="tertiary">{label}</Text>
      <Num value={value} digits={digits} pnl={pnl} suffix={suffix} variant="numLg" />
    </View>
  );
}
