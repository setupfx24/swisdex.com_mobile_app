import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import { Text, Num, Divider, Field, Button, Pressable, SkeletonRow } from '@/ui';
import { useTheme, type Theme } from '@/theme';
import {
  pammApi,
  socialApi,
  walletApi,
  type MammPammAccount,
  type MyAllocation,
  type AllocationSummary,
  type PammConfig,
  type PammTrades,
  type PammTrade,
  type ProviderApplication,
  type MasterPerformance,
  type MasterInvestor,
} from '@/lib/api/earn';
import { useAccountsStore } from '@/stores/accountsStore';
import { useAuthStore } from '@/stores/authStore';
import { ProfileHeader } from '../profile';

type TabId = 'browse' | 'investments' | 'apply' | 'dashboard';

const TABS: { id: TabId; label: string }[] = [
  { id: 'browse', label: 'Browse' },
  { id: 'investments', label: 'My Investments' },
  { id: 'apply', label: 'Become Manager' },
  { id: 'dashboard', label: 'My Dashboard' },
];

function toArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object' && Array.isArray((res as { items?: T[] }).items)) {
    return (res as { items: T[] }).items;
  }
  if (res && typeof res === 'object' && Array.isArray((res as { investors?: T[] }).investors)) {
    return (res as { investors: T[] }).investors;
  }
  return [];
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── Shared small components ─────────────────────────────────────────── */

function TypeBadge({ type }: { type: string }) {
  return <Text variant="labelXs" tone="accent" weight="bold">{(type || '').toUpperCase()}</Text>;
}

function Money({
  value,
  pnl = false,
  variant = 'numLg',
  tone,
}: {
  value: number;
  pnl?: boolean;
  variant?: 'numLg' | 'bodyMd' | 'body';
  tone?: 'accent' | 'primary';
}) {
  const symbolTone = tone ?? (pnl ? (value > 0 ? 'buy' : value < 0 ? 'sell' : 'secondary') : 'primary');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text variant={variant} tone={symbolTone}>$</Text>
      <Num value={value} digits={2} pnl={pnl} signed={pnl} tone={tone} variant={variant} />
    </View>
  );
}

function StatBox({
  label,
  value,
  prefix,
  suffix,
  digits = 2,
  tone,
  theme,
}: {
  label: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  digits?: number;
  tone?: 'pnl' | 'sell';
  theme: Theme;
}) {
  const signed = tone === 'pnl';
  const numTone = tone === 'sell' ? 'sell' : tone === 'pnl' ? undefined : 'primary';
  return (
    <View style={{ minWidth: 80 }}>
      <Text variant="labelXs" tone="tertiary">{label}</Text>
      {typeof value === 'string' ? (
        <Text variant="numLg" tone="primary">{value}</Text>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          {prefix ? <Text variant="numLg" tone={tone === 'sell' ? 'sell' : 'primary'}>{prefix}</Text> : null}
          <Num value={value} digits={digits} suffix={suffix} pnl={signed} signed={signed} tone={numTone} variant="numLg" />
        </View>
      )}
    </View>
  );
}

function Row({ label, value, theme, tone }: { label: string; value: string; theme: Theme; tone?: 'primary' | 'sell' | 'buy' }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing[1] }}>
      <Text variant="body" tone="tertiary">{label}</Text>
      <Text variant="bodyMd" weight="medium" tone={tone ?? 'primary'}>{value}</Text>
    </View>
  );
}

function TradeRow({ t, theme }: { t: PammTrade; theme: Theme }) {
  const isBuy = (t.side || '').toLowerCase() === 'buy';
  return (
    <View
      style={{
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
        backgroundColor: theme.colors.bg.secondary,
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[2],
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing[2] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], flex: 1 }}>
          <Text variant="labelXs" tone={isBuy ? 'buy' : 'sell'} weight="bold">{(t.side || '').toUpperCase()}</Text>
          <Text variant="bodyMd" weight="semibold" numberOfLines={1}>{t.symbol}</Text>
          <Text variant="labelXs" tone="tertiary">{t.lots} lots</Text>
          {t.status === 'open' ? <Text variant="labelXs" tone="warning" weight="bold">LIVE</Text> : null}
        </View>
        <Num value={t.master_pnl} digits={2} pnl signed variant="bodyMd" />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing[1] }}>
        <Text variant="labelXs" tone="tertiary">
          {t.open_price.toFixed(5)}{t.close_price != null ? ` → ${t.close_price.toFixed(5)}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text variant="labelXs" tone="tertiary">Your share</Text>
          <Num value={t.your_share} digits={2} pnl signed variant="labelXs" />
        </View>
      </View>
    </View>
  );
}

/* ─── Screen ──────────────────────────────────────────────────────────── */

export default function PammScreen() {
  const theme = useTheme();
  const isDemo = useAuthStore((s) => s.user?.is_demo);
  const [tab, setTab] = useState<TabId>('browse');

  // PAMM policy banner — fetched once, informational only.
  const [config, setConfig] = useState<PammConfig | null>(null);
  useEffect(() => {
    pammApi.config().then(setConfig).catch(() => setConfig(null));
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'PAMM' }} />
      <ProfileHeader title="PAMM" />

      {isDemo ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing[6] }}>
          <Text variant="bodyLg" weight="bold" align="center">PAMM is locked on demo</Text>
          <View style={{ height: theme.spacing[2] }} />
          <Text variant="bodyMd" tone="tertiary" align="center">
            PAMM is only available on a real trading account. Register a live account to allocate funds to a manager.
          </Text>
        </View>
      ) : (
        <>
          {/* Title + sub */}
          <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[2] }}>
            <Text variant="bodyMd" tone="tertiary">Pooled managed-account investing</Text>
          </View>

          {/* Policy banner */}
          {config ? <ConfigBanner config={config} theme={theme} /> : null}

          {/* Tab switcher */}
          <View style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.border.primary, marginTop: theme.spacing[2] }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: theme.spacing[2] }}
            >
              {TABS.map((t) => {
                const active = t.id === tab;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setTab(t.id)}
                    haptic="light"
                    style={{
                      paddingVertical: theme.spacing[3],
                      paddingHorizontal: theme.spacing[3],
                      marginRight: theme.spacing[1],
                      borderBottomWidth: 2,
                      borderBottomColor: active ? theme.colors.buy : 'transparent',
                    }}
                  >
                    <Text variant="bodyMd" weight={active ? 'bold' : 'medium'} tone={active ? 'accent' : 'secondary'}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {tab === 'browse' && <BrowseTab theme={theme} />}
          {tab === 'investments' && <InvestmentsTab theme={theme} onBrowse={() => setTab('browse')} />}
          {tab === 'apply' && <ApplyTab theme={theme} config={config} onApproved={() => setTab('dashboard')} />}
          {tab === 'dashboard' && <DashboardTab theme={theme} onApply={() => setTab('apply')} />}
        </>
      )}
    </SafeAreaView>
  );
}

function ConfigBanner({ config, theme }: { config: PammConfig; theme: Theme }) {
  return (
    <View
      style={{
        marginHorizontal: theme.spacing[4],
        marginTop: theme.spacing[3],
        padding: theme.spacing[3],
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border.accent,
        backgroundColor: theme.colors.buyBg,
      }}
    >
      <Text variant="body" tone="secondary">
        Deposits &amp; withdrawals: day {config.dep_window_start_day}–{config.dep_window_end_day} of each month ·
        Trading: day {config.trade_window_start_day}–{config.trade_window_end_day} ·
        Company fees: {config.monthly_profit_fee_pct}% monthly profit · {config.annual_maintenance_pct}% annual maintenance
      </Text>
    </View>
  );
}

/* ─── Browse Tab ──────────────────────────────────────────────────────── */

function BrowseTab({ theme }: { theme: Theme }) {
  const [list, setList] = useState<MammPammAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [investTarget, setInvestTarget] = useState<MammPammAccount | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setList(null);
    try {
      setList(toArray<MammPammAccount>(await pammApi.list()));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load managed accounts.');
      setList([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[10] }}>
        {error ? (
          <View style={{ padding: theme.spacing[4] }}>
            <Text variant="bodyMd" tone="sell" align="center">{error}</Text>
            <View style={{ height: theme.spacing[2] }} />
            <Button variant="secondary" onPress={() => void load()}>Retry</Button>
          </View>
        ) : list === null ? (
          <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={4} /></View>
        ) : list.length === 0 ? (
          <View style={{ padding: theme.spacing[6] }}>
            <Text variant="bodyMd" tone="tertiary" align="center">No managed accounts available.</Text>
            <View style={{ height: theme.spacing[1] }} />
            <Text variant="body" tone="tertiary" align="center">PAMM managers will appear here once approved.</Text>
          </View>
        ) : (
          list.map((a) => (
            <View key={a.id}>
              <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
                      <Text variant="bodyMd" weight="bold" numberOfLines={1}>{a.manager_name}</Text>
                      <TypeBadge type={a.master_type} />
                    </View>
                    {a.description ? (
                      <Text variant="body" tone="tertiary" numberOfLines={2}>{a.description}</Text>
                    ) : null}
                  </View>
                  <Button size="sm" fullWidth={false} onPress={() => setInvestTarget(a)}>Invest</Button>
                </View>

                <View style={{ marginTop: theme.spacing[2] }}>
                  <Text variant="labelXs" tone="tertiary">TOTAL ROI</Text>
                  <Num value={a.total_return_pct} digits={2} suffix="%" pnl signed variant="numXl" />
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[4], marginTop: theme.spacing[2] }}>
                  <StatBox label="Drawdown" tone="sell" value={a.max_drawdown_pct} suffix="%" theme={theme} />
                  <StatBox label="Investors" value={a.active_investors} digits={0} theme={theme} />
                  <StatBox label="Slots" value={a.slots_available} digits={0} theme={theme} />
                  <StatBox label="Perf fee" value={a.performance_fee_pct} suffix="%" theme={theme} />
                  <StatBox label="Min" value={a.min_investment} prefix="$" digits={0} theme={theme} />
                </View>
              </View>
              <Divider inset={theme.spacing[4]} />
            </View>
          ))
        )}
      </ScrollView>

      <InvestModal
        theme={theme}
        target={investTarget}
        onClose={() => setInvestTarget(null)}
        onSuccess={() => { setInvestTarget(null); void load(); }}
      />
    </>
  );
}

/* ─── Invest Modal (Browse "Invest" + Refill top-up) ──────────────────── */

function InvestModal({
  theme,
  target,
  onClose,
  onSuccess,
}: {
  theme: Theme;
  target: MammPammAccount | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const accounts = useAccountsStore((s) => s.accounts);
  const active = useAccountsStore((s) => s.active);
  const liveAccounts = accounts.filter((a) => !a.is_demo);

  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [mode, setMode] = useState<'scaling' | 'multiplier'>('scaling');
  const [scaling, setScaling] = useState('100');
  const [multiplier, setMultiplier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletBonus, setWalletBonus] = useState(0);

  useEffect(() => {
    if (!target) return;
    setAmount(String(target.min_investment || ''));
    setAccountId(active && !active.is_demo ? active.id : liveAccounts[0]?.id ?? '');
    setMode('scaling');
    setScaling('100');
    setMultiplier('');
    setError(null);
    walletApi
      .summary()
      .then((s) => {
        setWalletBalance(Number(s.main_wallet_balance) || 0);
        setWalletBonus(Number((s as { main_wallet_bonus?: number }).main_wallet_bonus) || 0);
      })
      .catch(() => { setWalletBalance(0); setWalletBonus(0); });
  }, [target, active, accounts]);

  const isMam = target?.master_type === 'mamm';

  const submit = async () => {
    if (!target) return;
    setError(null);
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setError('Enter a valid amount.');
    if (amt < target.min_investment) return setError(`Minimum investment is $${target.min_investment}.`);
    if (amt > walletBalance) return setError('Insufficient cash balance — bonus credit is not usable on MAM/PAMM.');
    if (!accountId) return setError('Pick a live trading account.');

    let opts: { volumeScalingPct?: number; lotMultiplier?: number } | undefined;
    if (isMam) {
      if (mode === 'multiplier') {
        const m = parseFloat(multiplier);
        if (!Number.isFinite(m) || m < 0.01 || m > 100) return setError('Lot multiplier must be 0.01–100.');
        opts = { lotMultiplier: m };
      } else {
        const s = parseFloat(scaling);
        if (!Number.isFinite(s) || s < 1 || s > 500) return setError('Volume scaling must be 1–500.');
        opts = { volumeScalingPct: s };
      }
    }

    setSubmitting(true);
    try {
      await pammApi.invest(target.id, accountId, amt, opts);
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to invest.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={() => !submitting && onClose()}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              backgroundColor: theme.colors.bg.base,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              maxHeight: '90%',
            }}
          >
            <ScrollView contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
                <Text variant="bodyLg" weight="bold">Invest with {target?.manager_name}</Text>
              </View>
              {target ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
                  <TypeBadge type={target.master_type} />
                  <Text variant="body" tone="tertiary">Min ${target.min_investment.toLocaleString()}</Text>
                </View>
              ) : null}

              {/* Wallet balance card */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: theme.spacing[3],
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border.accent,
                  backgroundColor: theme.colors.bg.secondary,
                }}
              >
                <View>
                  <Text variant="labelXs" tone="tertiary">FROM MAIN WALLET</Text>
                  <Money value={walletBalance} tone="accent" />
                </View>
                <Pressable onPress={() => setAmount(String(Math.max(0, walletBalance)))} haptic="light">
                  <Text variant="bodyMd" tone="accent" weight="bold">Max</Text>
                </Pressable>
              </View>

              <Field
                label="Investment amount (USD)"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder={target ? `Min $${target.min_investment}` : undefined}
                editable={!submitting}
              />

              {/* MAM mode toggle */}
              {isMam ? (
                <View style={{ gap: theme.spacing[2] }}>
                  <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
                    {(['scaling', 'multiplier'] as const).map((m) => {
                      const sel = mode === m;
                      return (
                        <Pressable
                          key={m}
                          onPress={() => setMode(m)}
                          haptic="light"
                          style={{
                            flex: 1,
                            paddingVertical: theme.spacing[2],
                            borderRadius: theme.radius.md,
                            borderWidth: 1,
                            alignItems: 'center',
                            borderColor: sel ? theme.colors.buy : theme.colors.border.primary,
                            backgroundColor: sel ? theme.colors.buyBg : theme.colors.bg.secondary,
                          }}
                        >
                          <Text variant="bodyMd" weight={sel ? 'bold' : 'medium'} tone={sel ? 'buy' : 'secondary'}>
                            {m === 'scaling' ? 'Volume scaling %' : 'Direct lot ×'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {mode === 'scaling' ? (
                    <Field
                      label="Volume scaling %"
                      value={scaling}
                      onChangeText={setScaling}
                      keyboardType="decimal-pad"
                      hint="100 = proportional share · 200 = 2× leverage (1–500)"
                      editable={!submitting}
                    />
                  ) : (
                    <Field
                      label="Lot multiplier"
                      value={multiplier}
                      onChangeText={setMultiplier}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 0.5"
                      hint="Take master_lots × this value on every trade (0.01–100)"
                      editable={!submitting}
                    />
                  )}
                </View>
              ) : null}

              {/* Fee stack */}
              {target ? (
                <View
                  style={{
                    borderRadius: theme.radius.md,
                    borderWidth: 1,
                    borderColor: theme.colors.border.primary,
                    backgroundColor: theme.colors.bg.secondary,
                    padding: theme.spacing[3],
                    gap: theme.spacing[1],
                  }}
                >
                  <Row label="Performance fee" value={`${Number(target.performance_fee_pct ?? 0).toFixed(1)}%`} theme={theme} />
                  {Number(target.management_fee_pct ?? 0) > 0 ? (
                    <Row label="Management fee (annual)" value={`${Number(target.management_fee_pct).toFixed(1)}%`} theme={theme} />
                  ) : null}
                  {Number(target.admin_commission_pct ?? 0) > 0 ? (
                    <Row label="Broker commission (of perf fee)" value={`${Number(target.admin_commission_pct).toFixed(1)}%`} theme={theme} />
                  ) : null}
                  <Divider />
                  <Row label="Slots left" value={String(target.slots_available)} theme={theme} />
                </View>
              ) : null}

              {/* Risk caps (amber) */}
              {target && (target.max_drawdown_pct > 0 || (target.max_loss_per_trade_pct ?? 0) > 0) ? (
                <View
                  style={{
                    borderRadius: theme.radius.md,
                    borderWidth: 1,
                    borderColor: theme.colors.warning,
                    backgroundColor: theme.colors.bg.secondary,
                    padding: theme.spacing[3],
                    gap: theme.spacing[1],
                  }}
                >
                  <Text variant="label" tone="warning" weight="bold">BROKER RISK CAPS</Text>
                  {target.max_drawdown_pct > 0 ? (
                    <Row label="Max drawdown" value={`${Number(target.max_drawdown_pct).toFixed(2)}%`} theme={theme} />
                  ) : null}
                  {(target.max_loss_per_trade_pct ?? 0) > 0 ? (
                    <Row label="Max loss / trade" value={`${Number(target.max_loss_per_trade_pct).toFixed(2)}%`} theme={theme} />
                  ) : null}
                  <Text variant="body" tone="warning">Set by the broker — automatic safeguards beyond your control.</Text>
                </View>
              ) : null}

              {/* Live account picker */}
              <View>
                <Text variant="label" tone="secondary">Live account</Text>
                <View style={{ height: theme.spacing[1] }} />
                {liveAccounts.length === 0 ? (
                  <Text variant="body" tone="tertiary">No live account — open one to invest.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing[2] }}>
                    {liveAccounts.map((acc) => {
                      const sel = acc.id === accountId;
                      return (
                        <Pressable
                          key={acc.id}
                          onPress={() => setAccountId(acc.id)}
                          haptic="light"
                          style={({ pressed }) => ({
                            paddingVertical: theme.spacing[2],
                            paddingHorizontal: theme.spacing[3],
                            borderRadius: theme.radius.md,
                            backgroundColor: sel ? theme.colors.buyBg : pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                            borderWidth: 1,
                            borderColor: sel ? theme.colors.buy : theme.colors.border.primary,
                          })}
                        >
                          <Text variant="labelXs" tone="tertiary">#{acc.account_number}</Text>
                          <Text variant="bodyMd" weight={sel ? 'bold' : 'medium'}>{acc.equity.toFixed(2)} {acc.currency}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              <Text variant="body" tone="tertiary">
                Available cash: ${walletBalance.toFixed(2)}
                {walletBonus > 0 ? ` · bonus $${walletBonus.toFixed(2)} (not usable for MAM/PAMM)` : ''}
              </Text>

              {error ? <Text variant="body" tone="sell">{error}</Text> : null}
              <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
                <View style={{ flex: 1 }}><Button variant="secondary" onPress={onClose}>Cancel</Button></View>
                <View style={{ flex: 1 }}>
                  <Button onPress={submit} loading={submitting} disabled={liveAccounts.length === 0}>Confirm Invest</Button>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ─── My Investments Tab ──────────────────────────────────────────────── */

function InvestmentsTab({ theme, onBrowse }: { theme: Theme; onBrowse: () => void }) {
  const accounts = useAccountsStore((s) => s.accounts);
  const active = useAccountsStore((s) => s.active);
  const liveAccounts = accounts.filter((a) => !a.is_demo);

  const [allocations, setAllocations] = useState<MyAllocation[] | null>(null);
  const [summary, setSummary] = useState<AllocationSummary | null>(null);

  // Withdraw / refill modals
  const [withdrawTarget, setWithdrawTarget] = useState<MyAllocation | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [refillTarget, setRefillTarget] = useState<MyAllocation | null>(null);

  // Master-trades expand
  const [expanded, setExpanded] = useState<string | null>(null);
  const [trades, setTrades] = useState<Record<string, PammTrades>>({});
  const [tradesLoading, setTradesLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setAllocations(null);
    try {
      const res = await pammApi.myAllocations();
      setAllocations(toArray<MyAllocation>(res));
      setSummary(res && typeof res === 'object' ? (res as { summary?: AllocationSummary }).summary ?? null : null);
    } catch {
      setAllocations([]);
      setSummary(null);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggleTrades = async (a: MyAllocation) => {
    if (expanded === a.id) { setExpanded(null); return; }
    setExpanded(a.id);
    if (a.master_type !== 'pamm' || trades[a.id]) return;
    setTradesLoading(a.id);
    try {
      const res = await pammApi.trades(a.id);
      setTrades((prev) => ({ ...prev, [a.id]: res }));
    } catch {
      /* leave unset — renders "No data" */
    } finally {
      setTradesLoading(null);
    }
  };

  const submitWithdraw = async () => {
    if (!withdrawTarget) return;
    setWithdrawing(true);
    try {
      await pammApi.withdraw(withdrawTarget.id);
      setWithdrawTarget(null);
      await load();
    } catch {
      setWithdrawing(false);
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[10] }}>
        {allocations === null ? (
          <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={3} /></View>
        ) : allocations.length === 0 ? (
          <View style={{ padding: theme.spacing[6] }}>
            <Text variant="bodyMd" tone="tertiary" align="center">No active investments.</Text>
            <View style={{ height: theme.spacing[3] }} />
            <Button variant="secondary" onPress={onBrowse}>Browse Managers</Button>
          </View>
        ) : (
          <>
            {summary ? (
              <>
                <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3], flexDirection: 'row', justifyContent: 'space-between' }}>
                  <StatBox label="Invested" value={summary.total_invested} prefix="$" theme={theme} />
                  <StatBox label="Value" value={summary.total_current_value} prefix="$" theme={theme} />
                  <StatBox label="P&L" tone="pnl" value={summary.total_pnl} prefix="$" theme={theme} />
                  <StatBox label="P&L %" tone="pnl" value={summary.overall_pnl_pct} suffix="%" theme={theme} />
                </View>
                <Divider />
              </>
            ) : null}

            {allocations.map((a) => (
              <View key={a.id}>
                <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
                        <Text variant="bodyMd" weight="bold" numberOfLines={1}>{a.manager_name}</Text>
                        <TypeBadge type={a.master_type} />
                      </View>
                      <Text variant="labelXs" tone="tertiary">joined {format(new Date(a.joined_at), 'MMM d, yyyy')}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Num value={a.total_pnl} digits={2} pnl signed variant="numLg" />
                      <Num value={a.pnl_pct} digits={2} pnl signed suffix="%" variant="caption" />
                    </View>
                  </View>

                  <View style={{ marginTop: theme.spacing[1] }}>
                    <Row label="Invested" value={`$${fmt(a.allocation_amount)}`} theme={theme} />
                    <Row label="Current value" value={`$${fmt(a.current_value)}`} theme={theme} />
                    <Row label="Realized" value={`$${fmt(a.realized_pnl)}`} theme={theme} tone={a.realized_pnl >= 0 ? 'buy' : 'sell'} />
                    <Row label="Unrealized" value={`$${fmt(a.unrealized_pnl)}`} theme={theme} tone={a.unrealized_pnl >= 0 ? 'buy' : 'sell'} />
                  </View>

                  {/* Fee breakdown */}
                  {a.performance_fee_pct > 0 ? (
                    <View
                      style={{
                        marginTop: theme.spacing[2],
                        borderRadius: theme.radius.md,
                        borderWidth: 1,
                        borderColor: theme.colors.border.primary,
                        backgroundColor: theme.colors.bg.secondary,
                        padding: theme.spacing[3],
                        gap: theme.spacing[1],
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text variant="label" tone="secondary" weight="bold">CHARGES ON PROFIT</Text>
                        <Text variant="label" tone="secondary">{a.performance_fee_pct}% total</Text>
                      </View>
                      <Row label="Master keeps" value={`${(a.master_share_pct ?? a.performance_fee_pct).toFixed(2)}%`} theme={theme} />
                      {(a.admin_share_pct ?? 0) > 0 ? (
                        <Row label="Broker commission" value={`${(a.admin_share_pct ?? 0).toFixed(2)}%`} theme={theme} />
                      ) : null}
                      {(a.fees_paid_estimate ?? 0) > 0 ? (
                        <Row label="Fees paid (est.)" value={`−$${fmt(a.fees_paid_estimate ?? 0)}`} theme={theme} tone="sell" />
                      ) : null}
                    </View>
                  ) : null}

                  {/* Bonus warning */}
                  {(a.bonus_portion ?? 0) > 0 ? (
                    <View
                      style={{
                        marginTop: theme.spacing[2],
                        borderRadius: theme.radius.md,
                        borderWidth: 1,
                        borderColor: theme.colors.sell,
                        backgroundColor: theme.colors.sellBg,
                        padding: theme.spacing[3],
                      }}
                    >
                      <Text variant="body" tone="sell">
                        ${fmt(a.bonus_portion ?? 0)} of this allocation was funded from bonus credit and is non-withdrawable on exit.
                      </Text>
                    </View>
                  ) : null}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing[2] }}>
                    {a.management_fee_pct ? (
                      <Text variant="labelXs" tone="tertiary">Mgmt: {a.management_fee_pct}% / yr</Text>
                    ) : <View />}
                  </View>

                  {a.status === 'active' ? (
                    <View style={{ flexDirection: 'row', gap: theme.spacing[2], marginTop: theme.spacing[2] }}>
                      <Button size="sm" variant="secondary" fullWidth={false} onPress={() => setRefillTarget(a)}>+ Refill</Button>
                      <Button size="sm" variant="secondary" fullWidth={false} onPress={() => setWithdrawTarget(a)}>Withdraw</Button>
                    </View>
                  ) : null}

                  {/* PAMM-only master trades */}
                  {a.master_type === 'pamm' ? (
                    <Pressable onPress={() => void toggleTrades(a)} haptic="light" style={{ marginTop: theme.spacing[2], paddingVertical: theme.spacing[2], alignItems: 'center' }}>
                      <Text variant="bodyMd" tone="accent" weight="bold">
                        {expanded === a.id ? 'Hide Master Trades' : 'View Master Trades'}
                      </Text>
                    </Pressable>
                  ) : null}

                  {expanded === a.id && a.master_type === 'pamm' ? (
                    <View style={{ marginTop: theme.spacing[2], gap: theme.spacing[2] }}>
                      {tradesLoading === a.id ? (
                        <SkeletonRow count={2} />
                      ) : trades[a.id] ? (
                        <>
                          <Text variant="labelXs" tone="tertiary">
                            Your pool share: {trades[a.id]!.your_ratio_pct.toFixed(2)}%
                          </Text>
                          {[...trades[a.id]!.open_trades, ...trades[a.id]!.closed_trades].length === 0 ? (
                            <Text variant="body" tone="tertiary" align="center">Master has no trades yet.</Text>
                          ) : (
                            <>
                              {trades[a.id]!.open_trades.map((t) => <TradeRow key={t.id} t={t} theme={theme} />)}
                              {trades[a.id]!.closed_trades.map((t) => <TradeRow key={t.id} t={t} theme={theme} />)}
                            </>
                          )}
                        </>
                      ) : (
                        <Text variant="body" tone="tertiary" align="center">No data.</Text>
                      )}
                    </View>
                  ) : null}
                </View>
                <Divider inset={theme.spacing[4]} />
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Withdraw modal */}
      <Modal visible={!!withdrawTarget} transparent animationType="slide" onRequestClose={() => !withdrawing && setWithdrawTarget(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }}>
          <View
            style={{
              backgroundColor: theme.colors.bg.base,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              padding: theme.spacing[4],
              gap: theme.spacing[3],
            }}
          >
            {withdrawTarget ? (
              <>
                <Text variant="bodyLg" weight="bold">
                  {withdrawTarget.master_type === 'pamm' ? 'Exit PAMM pool' : 'Exit MAM allocation'}
                </Text>
                <View style={{ gap: theme.spacing[1] }}>
                  <Row label="Manager" value={withdrawTarget.manager_name} theme={theme} />
                  <Row label={withdrawTarget.master_type === 'pamm' ? 'Pool share' : 'Invested'} value={`$${fmt(withdrawTarget.allocation_amount)}`} theme={theme} />
                  <Row label="Total P&L" value={`${withdrawTarget.total_pnl >= 0 ? '+' : ''}$${fmt(withdrawTarget.total_pnl)}`} theme={theme} tone={withdrawTarget.total_pnl >= 0 ? 'buy' : 'sell'} />
                </View>
                <Text variant="body" tone="warning">
                  {withdrawTarget.master_type === 'pamm'
                    ? 'PAMM exit: your pool share is valued at the current pool balance, the performance fee is netted, and capital + P&L returns to your main wallet. Withdrawals process only inside the admin-set monthly window.'
                    : 'MAM exit: every open position on your investor sub-account is closed at market, realised P&L (after performance fee) lands on your main wallet, and the sub-account is retired.'}
                </Text>
                {(withdrawTarget.bonus_portion ?? 0) > 0 ? (
                  <Text variant="body" tone="sell">
                    Bonus forfeit on exit: ${fmt(withdrawTarget.bonus_portion ?? 0)} of this allocation was funded from your bonus balance and will be deducted from the returned amount.
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
                  <View style={{ flex: 1 }}><Button variant="secondary" onPress={() => setWithdrawTarget(null)} disabled={withdrawing}>Cancel</Button></View>
                  <View style={{ flex: 1 }}><Button variant="sell" onPress={submitWithdraw} loading={withdrawing}>Confirm Withdraw</Button></View>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Refill modal — top-up an existing allocation via its master_id */}
      <RefillModal
        theme={theme}
        target={refillTarget}
        liveAccounts={liveAccounts}
        active={active}
        onClose={() => setRefillTarget(null)}
        onSuccess={() => { setRefillTarget(null); void load(); }}
      />
    </>
  );
}

function RefillModal({
  theme,
  target,
  liveAccounts,
  active,
  onClose,
  onSuccess,
}: {
  theme: Theme;
  target: MyAllocation | null;
  liveAccounts: ReturnType<typeof useAccountsStore.getState>['accounts'];
  active: ReturnType<typeof useAccountsStore.getState>['active'];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletBal, setWalletBal] = useState(0);

  useEffect(() => {
    if (!target) return;
    setAmount('');
    setError(null);
    walletApi.summary().then((s) => setWalletBal(Number(s.main_wallet_balance) || 0)).catch(() => setWalletBal(0));
  }, [target]);

  const submit = async () => {
    if (!target) return;
    setError(null);
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setError('Enter a positive amount.');
    if (amt > walletBal) return setError('Insufficient wallet balance.');
    const acct = (active && !active.is_demo ? active : null) ?? liveAccounts[0];
    if (!acct) return setError('No live trading account found.');
    setSubmitting(true);
    try {
      await pammApi.invest(target.master_id, acct.id, amt);
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Refill failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={() => !submitting && onClose()}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              backgroundColor: theme.colors.bg.base,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              padding: theme.spacing[4],
              gap: theme.spacing[3],
            }}
          >
            <Text variant="bodyLg" weight="bold">Refill — {target?.manager_name}</Text>
            {target ? <Row label="Current investment" value={`$${fmt(target.allocation_amount)}`} theme={theme} /> : null}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: theme.spacing[3],
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: theme.colors.border.accent,
                backgroundColor: theme.colors.bg.secondary,
              }}
            >
              <View>
                <Text variant="labelXs" tone="tertiary">WALLET BALANCE</Text>
                <Money value={walletBal} tone="accent" />
              </View>
              <Pressable onPress={() => setAmount(String(Math.max(0, walletBal)))} haptic="light">
                <Text variant="bodyMd" tone="accent" weight="bold">Max</Text>
              </Pressable>
            </View>
            <Field label="Add amount (USD)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!submitting} />
            {error ? <Text variant="body" tone="sell">{error}</Text> : null}
            <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
              <View style={{ flex: 1 }}><Button variant="secondary" onPress={onClose}>Cancel</Button></View>
              <View style={{ flex: 1 }}><Button onPress={submit} loading={submitting}>Add funds</Button></View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ─── Become Manager Tab ──────────────────────────────────────────────── */

function ApplyTab({ theme, config, onApproved }: { theme: Theme; config: PammConfig | null; onApproved: () => void }) {
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<ProviderApplication | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [perfFee, setPerfFee] = useState('20');
  const [mgmtFee, setMgmtFee] = useState('0');
  const [minInvest, setMinInvest] = useState('100');
  const [maxInvestors, setMaxInvestors] = useState('100');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await socialApi.myProvider('pamm');
      setExisting(res && res.status ? res : null);
    } catch {
      setExisting(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await socialApi.becomeProvider({
        master_type: 'pamm',
        performance_fee_pct: perfFee,
        management_fee_pct: mgmtFee,
        min_investment: minInvest,
        max_investors: maxInvestors,
        description: description || undefined,
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={4} /></View>;
  }

  if (existing) {
    if (existing.status === 'pending') {
      return (
        <View style={{ padding: theme.spacing[6] }}>
          <Text variant="bodyLg" weight="bold" align="center">Application under review</Text>
          <View style={{ height: theme.spacing[2] }} />
          <Text variant="bodyMd" tone="tertiary" align="center">
            Your PAMM manager application has been submitted. Our team will review it shortly.
          </Text>
        </View>
      );
    }
    if (existing.status === 'approved' && ['pamm', 'mamm'].includes(existing.master_type ?? '')) {
      return (
        <View style={{ padding: theme.spacing[6] }}>
          <Text variant="bodyLg" weight="bold" align="center" tone="buy">You&apos;re an approved manager</Text>
          <View style={{ height: theme.spacing[2] }} />
          <Text variant="bodyMd" tone="tertiary" align="center">View your investor stats and performance data.</Text>
          <View style={{ height: theme.spacing[3] }} />
          <Button onPress={onApproved}>View Dashboard</Button>
        </View>
      );
    }
    return (
      <View style={{ padding: theme.spacing[6] }}>
        <Text variant="bodyMd" tone="sell" align="center">Application {existing.status}.</Text>
        <View style={{ height: theme.spacing[1] }} />
        <Text variant="body" tone="tertiary" align="center">Contact support if you have questions.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing[4], paddingBottom: theme.spacing[10], gap: theme.spacing[3] }}>
        <Text variant="bodyLg" weight="bold">Apply as PAMM Manager</Text>
        <Text variant="body" tone="tertiary">Submit your application for admin review.</Text>

        {config ? (
          <View
            style={{
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.colors.warning,
              backgroundColor: theme.colors.bg.secondary,
              padding: theme.spacing[3],
              gap: theme.spacing[1],
            }}
          >
            <Text variant="body" tone="secondary">
              ${config.manager_min_deposit_usd.toLocaleString()} minimum wallet balance required, plus a ${config.application_fee_usd} non-refundable application fee charged on submit.
            </Text>
            <Text variant="body" tone="secondary">
              Performance fee is capped at {config.max_manager_commission_pct}% by platform policy.
            </Text>
          </View>
        ) : null}

        <View
          style={{
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border.primary,
            backgroundColor: theme.colors.bg.secondary,
            padding: theme.spacing[3],
          }}
        >
          <Text variant="body" tone="secondary">
            A new dedicated PAMM trading account will be created automatically with $0 balance when you submit.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
          <View style={{ flex: 1 }}><Field label="Performance fee %" value={perfFee} onChangeText={setPerfFee} keyboardType="decimal-pad" /></View>
          <View style={{ flex: 1 }}><Field label="Management fee %" value={mgmtFee} onChangeText={setMgmtFee} keyboardType="decimal-pad" /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
          <View style={{ flex: 1 }}><Field label="Min investment $" value={minInvest} onChangeText={setMinInvest} keyboardType="decimal-pad" /></View>
          <View style={{ flex: 1 }}><Field label="Max investors" value={maxInvestors} onChangeText={setMaxInvestors} keyboardType="number-pad" /></View>
        </View>
        <Field label="Description (optional)" value={description} onChangeText={setDescription} multiline placeholder="Describe your trading strategy…" />

        {error ? <Text variant="body" tone="sell">{error}</Text> : null}
        <Button onPress={submit} loading={submitting}>Submit application</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ─── My Dashboard Tab ────────────────────────────────────────────────── */

function DashboardTab({ theme, onApply }: { theme: Theme; onApply: () => void }) {
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState<MasterPerformance | null>(null);
  const [investors, setInvestors] = useState<MasterInvestor[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [perf, inv] = await Promise.all([
          socialApi.masterPerformance(),
          socialApi.masterInvestors().catch(() => ({ investors: [] })),
        ]);
        setPerformance(perf);
        setInvestors(toArray<MasterInvestor>(inv));
      } catch {
        setPerformance(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={4} /></View>;
  }

  if (!performance) {
    return (
      <View style={{ padding: theme.spacing[6] }}>
        <Text variant="bodyMd" tone="tertiary" align="center">No manager dashboard available.</Text>
        <View style={{ height: theme.spacing[1] }} />
        <Text variant="body" tone="tertiary" align="center">Apply as a PAMM manager to access this tab.</Text>
        <View style={{ height: theme.spacing[3] }} />
        <Button onPress={onApply}>Apply Now</Button>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing[4], paddingBottom: theme.spacing[10], gap: theme.spacing[3] }}>
      <Text variant="bodyLg" weight="bold">Master Dashboard</Text>

      <Text variant="label" tone="tertiary">OVERVIEW</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[4] }}>
        <StatBox label="Total AUM" value={performance.total_aum} prefix="$" theme={theme} />
        <StatBox label="Investors" value={`${performance.total_investors} / ${performance.max_investors}`} theme={theme} />
        <StatBox label="Fee earnings" tone="pnl" value={performance.fee_earnings} prefix="$" theme={theme} />
        <StatBox label="Total ROI" tone="pnl" value={performance.total_return_pct} suffix="%" theme={theme} />
      </View>
      <Divider />

      <Text variant="label" tone="tertiary">INVESTORS ({investors.length})</Text>
      {investors.length === 0 ? (
        <Text variant="body" tone="tertiary" align="center">No investors yet.</Text>
      ) : (
        investors.map((inv) => (
          <View key={inv.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing[2] }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMd" weight="medium" numberOfLines={1}>{inv.user_name}</Text>
                <Text variant="labelXs" tone="tertiary">
                  {inv.account_number} · {inv.share_pct.toFixed(1)}% · joined {format(new Date(inv.joined_at), 'MMM d, yyyy')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Money value={inv.allocated} variant="bodyMd" />
                <Num value={inv.pnl} digits={2} pnl signed variant="caption" />
              </View>
            </View>
            <Divider />
          </View>
        ))
      )}

      {performance.monthly_breakdown.length > 0 ? (
        <>
          <Divider />
          <Text variant="label" tone="tertiary">MONTHLY PERFORMANCE</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.spacing[1] }}>
            <Text variant="labelXs" tone="tertiary" style={{ flex: 1 }}>MONTH</Text>
            <Text variant="labelXs" tone="tertiary" style={{ flex: 1, textAlign: 'right' }}>PROFIT</Text>
            <Text variant="labelXs" tone="tertiary" style={{ flex: 1, textAlign: 'right' }}>CUMULATIVE</Text>
          </View>
          {performance.monthly_breakdown.map((row) => (
            <View key={row.month} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: theme.spacing[1] }}>
              <Text variant="bodyMd" weight="medium" style={{ flex: 1 }}>{row.month}</Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Num value={row.profit} digits={2} pnl signed variant="bodyMd" />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Num value={row.cumulative} digits={2} variant="bodyMd" tone={row.cumulative >= 0 ? 'primary' : 'sell'} />
              </View>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}
