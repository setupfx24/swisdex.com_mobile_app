import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Text, Num, Divider, Field, Button, Pressable, SkeletonRow } from '@/ui';
import { useTheme, type Theme } from '@/theme';
import {
  socialApi,
  walletApi,
  type Provider,
  type ProviderDetail,
  type CopySubscription,
  type ProviderApplication,
  type Follower,
} from '@/lib/api/earn';
import { useAccountsStore } from '@/stores/accountsStore';
import { ProfileHeader } from './profile';

type TabId = 'leaderboard' | 'my-copies' | 'become-provider' | 'my-dashboard';

const TABS: { id: TabId; label: string }[] = [
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'my-copies', label: 'Subscriptions' },
  { id: 'become-provider', label: 'Become Master' },
  { id: 'my-dashboard', label: 'Dashboard' },
];

function toArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object' && Array.isArray((res as { items?: T[] }).items)) {
    return (res as { items: T[] }).items;
  }
  return [];
}

/** $-prefixed number. `Num` has no prefix prop, so render the symbol as a
 *  sibling that adopts the resolved PnL colour where relevant. */
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

export default function SocialScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState<TabId>('leaderboard');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <Stack.Screen options={{ title: 'MAMM' }} />
      <ProfileHeader title="MAMM Trading" />

      {/* Tab switcher */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.border.primary }}>
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

      {tab === 'leaderboard' && <LeaderboardTab theme={theme} />}
      {tab === 'my-copies' && <MyCopiesTab theme={theme} />}
      {tab === 'become-provider' && <BecomeProviderTab theme={theme} />}
      {tab === 'my-dashboard' && <MyDashboardTab theme={theme} />}
    </SafeAreaView>
  );
}

/* ───────────────────────── Leaderboard Tab ───────────────────────── */
function LeaderboardTab({ theme }: { theme: Theme }) {
  const accounts = useAccountsStore((s) => s.accounts);
  const active = useAccountsStore((s) => s.active);

  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail modal
  const [detail, setDetail] = useState<ProviderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  // Copy modal
  const [copyTarget, setCopyTarget] = useState<Provider | ProviderDetail | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setProviders(null);
    try {
      const res = await socialApi.leaderboardPage('total_return_pct', page, 20);
      setProviders(toArray<Provider>(res));
      setTotalPages(res?.pages ?? 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load leaderboard.');
      setProviders([]);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await socialApi.providerDetail(id));
    } catch {
      setDetailOpen(false);
      Alert.alert('Failed', 'Could not load provider details.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[10] }}>
        {error ? (
          <View style={{ padding: theme.spacing[4] }}>
            <Text variant="bodyMd" tone="sell" align="center">{error}</Text>
            <View style={{ height: theme.spacing[2] }} />
            <Button variant="secondary" onPress={() => void load()}>Retry</Button>
          </View>
        ) : providers === null ? (
          <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={5} /></View>
        ) : providers.length === 0 ? (
          <View style={{ padding: theme.spacing[6] }}>
            <Text variant="bodyMd" tone="tertiary" align="center">No providers found.</Text>
          </View>
        ) : (
          providers.map((p) => (
            <View key={p.id}>
              <Pressable
                onPress={() => void openDetail(p.id)}
                haptic="light"
                style={({ pressed }) => ({
                  paddingHorizontal: theme.spacing[4],
                  paddingVertical: theme.spacing[3],
                  backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
                      <Text variant="bodyMd" weight="bold" numberOfLines={1}>{p.provider_name}</Text>
                      <Text variant="labelXs" tone="accent">MASTER</Text>
                    </View>
                    <Text variant="body" tone="tertiary" numberOfLines={1}>
                      Fee {p.performance_fee_pct}% · {p.followers_count} followers · min ${p.min_investment}
                    </Text>
                  </View>
                  <Num value={p.total_return_pct} digits={2} suffix="%" pnl signed variant="numLg" />
                  {p.is_copying ? (
                    <View
                      style={{
                        paddingVertical: theme.spacing[1],
                        paddingHorizontal: theme.spacing[3],
                        borderRadius: theme.radius.md,
                        borderWidth: 1,
                        borderColor: theme.colors.buy,
                        backgroundColor: theme.colors.buyBg,
                      }}
                    >
                      <Text variant="labelXs" tone="buy" weight="bold">FOLLOWING</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setCopyTarget(p)}
                      haptic="light"
                      style={({ pressed }) => ({
                        paddingVertical: theme.spacing[1],
                        paddingHorizontal: theme.spacing[3],
                        borderRadius: theme.radius.md,
                        backgroundColor: pressed ? theme.colors.buyDark : theme.colors.buy,
                      })}
                    >
                      <Text variant="labelXs" tone="inverse" weight="bold">COPY</Text>
                    </Pressable>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: theme.spacing[4], marginTop: theme.spacing[1] }}>
                  <Text variant="body" tone="tertiary">DD <Text variant="body" tone="sell">{p.max_drawdown_pct.toFixed(2)}%</Text></Text>
                  <Text variant="body" tone="tertiary">Sharpe <Text variant="body" tone="primary">{p.sharpe_ratio.toFixed(2)}</Text></Text>
                </View>
              </Pressable>
              <Divider inset={theme.spacing[4]} />
            </View>
          ))
        )}

        {totalPages > 1 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: theme.spacing[3], paddingVertical: theme.spacing[4] }}>
            <Button size="sm" variant="secondary" fullWidth={false} disabled={page <= 1} onPress={() => setPage((p) => p - 1)}>Prev</Button>
            <Text variant="body" tone="tertiary">{page} / {totalPages}</Text>
            <Button size="sm" variant="secondary" fullWidth={false} disabled={page >= totalPages} onPress={() => setPage((p) => p + 1)}>Next</Button>
          </View>
        ) : null}
      </ScrollView>

      {/* Detail modal */}
      <Modal visible={detailOpen} transparent animationType="slide" onRequestClose={() => setDetailOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }}>
          <View
            style={{
              backgroundColor: theme.colors.bg.base,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              maxHeight: '85%',
            }}
          >
            <ScrollView contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
              {detailLoading || !detail ? (
                <SkeletonRow count={4} />
              ) : (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="bodyLg" weight="bold">{detail.provider_name}</Text>
                    <Pressable onPress={() => setDetailOpen(false)} haptic="light">
                      <Text variant="bodyLg" tone="tertiary">✕</Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[4] }}>
                    <StatBox label="Total ROI" tone="pnl" value={detail.total_return_pct} suffix="%" theme={theme} />
                    <StatBox label="Max DD" tone="sell" value={detail.max_drawdown_pct} suffix="%" theme={theme} />
                    <StatBox label="Sharpe" value={detail.sharpe_ratio} theme={theme} />
                    <StatBox label="Win rate" value={detail.win_rate} suffix="%" theme={theme} />
                    <StatBox label="Trades" value={detail.total_trades} digits={0} theme={theme} />
                    <StatBox label="Profit" tone="pnl" value={detail.total_profit} prefix="$" theme={theme} />
                    <StatBox label="Followers" value={detail.followers_count} digits={0} theme={theme} />
                    <StatBox label="Investors" value={detail.active_investors} digits={0} theme={theme} />
                    <StatBox label="Fee" value={detail.performance_fee_pct} suffix="%" theme={theme} />
                  </View>
                  {detail.description ? (
                    <Text variant="bodyMd" tone="secondary">{detail.description}</Text>
                  ) : null}
                  {detail.monthly_breakdown && detail.monthly_breakdown.length > 0 ? (
                    <View>
                      <Text variant="label" tone="tertiary">MONTHLY BREAKDOWN</Text>
                      <View style={{ height: theme.spacing[1] }} />
                      {detail.monthly_breakdown.map((m) => (
                        <View key={m.month} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                          <Text variant="body" tone="tertiary">{m.month}</Text>
                          <Money value={m.profit} pnl variant="body" />
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <Button
                    disabled={detail.is_copying}
                    onPress={() => { setDetailOpen(false); setCopyTarget(detail); }}
                  >
                    {detail.is_copying ? 'Already Following' : 'Follow Manager'}
                  </Button>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Copy modal */}
      <CopyModal
        theme={theme}
        provider={copyTarget}
        accounts={accounts}
        activeId={active?.id ?? null}
        onClose={() => setCopyTarget(null)}
        onSuccess={() => { setCopyTarget(null); void load(); }}
      />
    </>
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
  value: number;
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
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        {prefix ? <Text variant="numLg" tone={tone === 'sell' ? 'sell' : 'primary'}>{prefix}</Text> : null}
        <Num value={value} digits={digits} suffix={suffix} pnl={signed} signed={signed} tone={numTone} variant="numLg" />
      </View>
    </View>
  );
}

/* ───────────────────────── Copy / Invest Modal ───────────────────────── */
function CopyModal({
  theme,
  provider,
  accounts,
  activeId,
  onClose,
  onSuccess,
}: {
  theme: Theme;
  provider: Provider | ProviderDetail | null;
  accounts: ReturnType<typeof useAccountsStore.getState>['accounts'];
  activeId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletBal, setWalletBal] = useState(0);

  useEffect(() => {
    if (!provider) return;
    setAmount(String(provider.min_investment || ''));
    setAccountId(activeId ?? accounts[0]?.id ?? '');
    setError(null);
    walletApi.summary().then((s) => setWalletBal(Number(s.main_wallet_balance) || 0)).catch(() => setWalletBal(0));
  }, [provider, activeId, accounts]);

  const submit = async () => {
    if (!provider) return;
    setError(null);
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setError('Enter a positive amount.');
    if (amt > walletBal) return setError('Insufficient wallet balance.');
    setSubmitting(true);
    try {
      const acctId = accountId || accounts[0]?.id || '00000000-0000-0000-0000-000000000000';
      await socialApi.copy(provider.id, acctId, amt);
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start subscription.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={!!provider} transparent animationType="slide" onRequestClose={onClose}>
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
            <Text variant="bodyLg" weight="bold">Follow {provider?.provider_name}</Text>
            <Text variant="body" tone="tertiary">
              Fee {provider?.performance_fee_pct}% · min ${provider?.min_investment}
            </Text>
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
                <Money value={walletBal} tone="accent" />
              </View>
              <Pressable onPress={() => setAmount(String(Math.max(0, walletBal)))} haptic="light">
                <Text variant="bodyMd" tone="accent" weight="bold">Max</Text>
              </Pressable>
            </View>
            <Text variant="body" tone="tertiary">
              A dedicated trading account will be auto-created for this subscription.
            </Text>
            <Field
              label="Investment amount (USD)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder={`Min $${provider?.min_investment ?? 0}`}
              editable={!submitting}
            />
            {error ? <Text variant="body" tone="sell">{error}</Text> : null}
            <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
              <View style={{ flex: 1 }}><Button variant="secondary" onPress={onClose}>Cancel</Button></View>
              <View style={{ flex: 1 }}><Button onPress={submit} loading={submitting}>Start following</Button></View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ───────────────────────── My Subscriptions Tab ───────────────────────── */
function MyCopiesTab({ theme }: { theme: Theme }) {
  const accounts = useAccountsStore((s) => s.accounts);
  const active = useAccountsStore((s) => s.active);
  const liveAccounts = accounts.filter((a) => !a.is_demo);

  const [copies, setCopies] = useState<CopySubscription[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Refill modal
  const [refillTarget, setRefillTarget] = useState<CopySubscription | null>(null);
  const [refillAmount, setRefillAmount] = useState('');
  const [refilling, setRefilling] = useState(false);
  const [refillErr, setRefillErr] = useState<string | null>(null);
  const [walletBal, setWalletBal] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    setCopies(null);
    try {
      const res = await socialApi.mySubscriptions();
      setCopies(toArray<CopySubscription>(res));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load subscriptions.');
      setCopies([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onStopSignal = (c: CopySubscription) => {
    Alert.alert('Stop following?', `New trades from ${c.provider_name} will no longer be mirrored.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: async () => {
          setBusyId(c.id);
          try {
            const r = await socialApi.stopCopy(c.id);
            Alert.alert('Stopped', r?.returned_to_wallet != null ? `$${r.returned_to_wallet.toFixed(2)} returned to wallet.` : `Stopped following ${c.provider_name}.`);
            setCopies((prev) => (prev ? prev.filter((x) => x.id !== c.id) : prev));
          } catch (e: unknown) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Could not stop.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const onWithdrawManaged = (c: CopySubscription) => {
    Alert.alert('Withdraw?', `Withdraw from ${c.provider_name}? Open positions will be closed at market.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          setBusyId(c.id);
          try {
            await socialApi.withdrawManaged(c.id);
            Alert.alert('Done', `Withdrawn from ${c.provider_name}.`);
            setCopies((prev) => (prev ? prev.filter((x) => x.id !== c.id) : prev));
          } catch (e: unknown) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Could not withdraw.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const openRefill = (c: CopySubscription) => {
    setRefillTarget(c);
    setRefillAmount('');
    setRefillErr(null);
    walletApi.summary().then((s) => setWalletBal(Number(s.main_wallet_balance) || 0)).catch(() => setWalletBal(0));
  };

  const submitRefill = async () => {
    if (!refillTarget) return;
    setRefillErr(null);
    const amt = parseFloat(refillAmount);
    if (!Number.isFinite(amt) || amt <= 0) return setRefillErr('Enter a positive amount.');
    if (amt > walletBal) return setRefillErr('Insufficient wallet balance.');
    setRefilling(true);
    try {
      if (refillTarget.copy_type === 'signal') {
        // Signal copies top-up via the copy endpoint with the same master.
        await socialApi.copy(refillTarget.master_id, refillTarget.id, amt);
      } else {
        const acct = (active && !active.is_demo ? active : null) ?? liveAccounts[0];
        if (!acct) { setRefillErr('No live trading account found.'); setRefilling(false); return; }
        await socialApi.investManaged(refillTarget.master_id, acct.id, amt);
      }
      setRefillTarget(null);
      await load();
    } catch (e: unknown) {
      setRefillErr(e instanceof Error ? e.message : 'Refill failed.');
    } finally {
      setRefilling(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[10] }}>
        {error ? (
          <View style={{ padding: theme.spacing[4] }}>
            <Text variant="bodyMd" tone="sell" align="center">{error}</Text>
            <View style={{ height: theme.spacing[2] }} />
            <Button variant="secondary" onPress={() => void load()}>Retry</Button>
          </View>
        ) : copies === null ? (
          <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={3} /></View>
        ) : copies.length === 0 ? (
          <View style={{ padding: theme.spacing[6] }}>
            <Text variant="bodyMd" tone="tertiary" align="center">No active subscriptions yet.</Text>
          </View>
        ) : (
          copies.map((c) => {
            const managed = c.copy_type === 'pamm' || c.copy_type === 'mam';
            return (
              <View key={c.id}>
                <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
                        <Text variant="bodyMd" weight="bold" numberOfLines={1}>{c.provider_name}</Text>
                        <Text variant="labelXs" tone="accent">{(c.copy_type || 'signal').toUpperCase()}</Text>
                        <Text variant="labelXs" tone={c.status === 'active' ? 'buy' : 'tertiary'}>{c.status.toUpperCase()}</Text>
                      </View>
                      <Text variant="body" tone="tertiary">
                        ${c.allocation_amount.toLocaleString()} allocated
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Money value={c.total_profit} pnl />
                      <Num value={c.total_return_pct} digits={2} suffix="%" pnl signed variant="caption" />
                    </View>
                  </View>
                  {c.status === 'active' ? (
                    <View style={{ flexDirection: 'row', gap: theme.spacing[2], marginTop: theme.spacing[2] }}>
                      <Button size="sm" variant="secondary" fullWidth={false} onPress={() => openRefill(c)}>+ Refill</Button>
                      {managed ? (
                        <Button size="sm" variant="secondary" fullWidth={false} disabled={busyId === c.id} onPress={() => onWithdrawManaged(c)}>
                          {busyId === c.id ? 'Withdrawing…' : 'Withdraw'}
                        </Button>
                      ) : (
                        <Button size="sm" variant="sell" fullWidth={false} disabled={busyId === c.id} onPress={() => onStopSignal(c)}>
                          {busyId === c.id ? 'Stopping…' : 'Stop'}
                        </Button>
                      )}
                    </View>
                  ) : null}
                </View>
                <Divider inset={theme.spacing[4]} />
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Refill modal */}
      <Modal visible={!!refillTarget} transparent animationType="slide" onRequestClose={() => !refilling && setRefillTarget(null)}>
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
              <Text variant="bodyLg" weight="bold">Refill — {refillTarget?.provider_name}</Text>
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
                <Pressable onPress={() => setRefillAmount(String(Math.max(0, walletBal)))} haptic="light">
                  <Text variant="bodyMd" tone="accent" weight="bold">Max</Text>
                </Pressable>
              </View>
              <Field
                label="Refill amount (USD)"
                value={refillAmount}
                onChangeText={setRefillAmount}
                keyboardType="decimal-pad"
                editable={!refilling}
              />
              {refillErr ? <Text variant="body" tone="sell">{refillErr}</Text> : null}
              <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
                <View style={{ flex: 1 }}><Button variant="secondary" onPress={() => setRefillTarget(null)}>Cancel</Button></View>
                <View style={{ flex: 1 }}><Button onPress={submitRefill} loading={refilling}>Add funds</Button></View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

/* ───────────────────────── Become Provider Tab ───────────────────────── */
const RISK_OPTIONS = ['Conservative', 'Low', 'Moderate', 'Aggressive', 'High Risk'];

function BecomeProviderTab({ theme }: { theme: Theme }) {
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<ProviderApplication | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [perfFee, setPerfFee] = useState('20');
  const [minInvest, setMinInvest] = useState('100');
  const [maxInvestors, setMaxInvestors] = useState('100');
  const [description, setDescription] = useState('');

  const [strategyName, setStrategyName] = useState('');
  const [market, setMarket] = useState('');
  const [riskProfile, setRiskProfile] = useState('Moderate');
  const [maxDrawdown, setMaxDrawdown] = useState('');
  const [recommendedCapital, setRecommendedCapital] = useState('');
  const [avgTrades, setAvgTrades] = useState('');
  const [expectedReturns, setExpectedReturns] = useState('');
  const [strategyDescription, setStrategyDescription] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await socialApi.myProvider('signal_provider');
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
      const strategyInfo: Record<string, string> = {};
      if (strategyName) strategyInfo.strategy_name = strategyName;
      if (market) strategyInfo.market = market;
      if (riskProfile) strategyInfo.risk_profile = riskProfile;
      if (maxDrawdown) strategyInfo.max_drawdown = maxDrawdown;
      if (recommendedCapital) strategyInfo.recommended_capital = recommendedCapital;
      if (avgTrades) strategyInfo.avg_trades = avgTrades;
      if (expectedReturns) strategyInfo.expected_returns = expectedReturns;
      if (strategyDescription) strategyInfo.description = strategyDescription;

      const res = await socialApi.becomeProvider({
        master_type: 'signal_provider',
        performance_fee_pct: perfFee,
        min_investment: minInvest,
        max_investors: maxInvestors,
        description: description || undefined,
        strategy_info: strategyInfo,
      });
      Alert.alert(
        'Submitted',
        res?.account_number
          ? `Application submitted! Master account ${res.account_number} created.`
          : 'Application submitted! Admin will review.',
      );
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
    const statusTone = existing.status === 'approved' ? 'buy' : existing.status === 'pending' ? 'warning' : 'sell';
    return (
      <ScrollView contentContainerStyle={{ padding: theme.spacing[4], paddingBottom: theme.spacing[10], gap: theme.spacing[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="bodyLg" weight="bold">Your Application</Text>
          <Text variant="labelXs" tone={statusTone} weight="bold">{(existing.status ?? '').toUpperCase()}</Text>
        </View>
        <Divider />
        <Row label="Type" value={(existing.master_type ?? 'signal_provider').replace('_', ' ')} theme={theme} />
        <Row label="Performance fee" value={`${existing.performance_fee_pct ?? 0}%`} theme={theme} />
        <Row label="Min investment" value={`$${existing.min_investment ?? 0}`} theme={theme} />
        <Row label="Max investors" value={String(existing.max_investors ?? 0)} theme={theme} />
        <Row label="Followers" value={String(existing.followers_count ?? 0)} theme={theme} />
        <Row label="Total trades" value={String(existing.total_trades ?? 0)} theme={theme} />
        {existing.status === 'pending' ? (
          <Text variant="body" tone="warning">Your application is under review by the admin team.</Text>
        ) : existing.status === 'rejected' ? (
          <Text variant="body" tone="sell">Your application was rejected. Contact support for details.</Text>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing[4], paddingBottom: theme.spacing[10], gap: theme.spacing[3] }}>
        <Text variant="bodyLg" weight="bold">Apply to Become a MAM Master</Text>
        <Text variant="body" tone="tertiary">
          Followers automatically mirror your trades in real time. Set your fees and describe your strategy.
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
          <View style={{ flex: 1 }}><Field label="Performance fee %" value={perfFee} onChangeText={setPerfFee} keyboardType="decimal-pad" /></View>
          <View style={{ flex: 1 }}><Field label="Min investment $" value={minInvest} onChangeText={setMinInvest} keyboardType="decimal-pad" /></View>
        </View>
        <Field label="Max investors" value={maxInvestors} onChangeText={setMaxInvestors} keyboardType="number-pad" />
        <Field label="Description / strategy" value={description} onChangeText={setDescription} multiline placeholder="Describe your trading strategy…" />

        <Divider />
        <Text variant="label" tone="tertiary">STRATEGY DETAILS (SHOWN TO INVESTORS)</Text>
        <Field label="Strategy name" value={strategyName} onChangeText={setStrategyName} placeholder="e.g. BTCUSD Momentum" />
        <Field label="Market / instrument" value={market} onChangeText={setMarket} placeholder="e.g. BTCUSD, XAUUSD" />
        <View>
          <Text variant="label" tone="secondary">Risk profile</Text>
          <View style={{ height: theme.spacing[1] }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing[2] }}>
            {RISK_OPTIONS.map((r) => {
              const sel = r === riskProfile;
              return (
                <Pressable
                  key={r}
                  onPress={() => setRiskProfile(r)}
                  haptic="light"
                  style={{
                    paddingVertical: theme.spacing[2],
                    paddingHorizontal: theme.spacing[3],
                    borderRadius: theme.radius.md,
                    borderWidth: 1,
                    borderColor: sel ? theme.colors.buy : theme.colors.border.primary,
                    backgroundColor: sel ? theme.colors.buyBg : theme.colors.bg.secondary,
                  }}
                >
                  <Text variant="bodyMd" weight={sel ? 'bold' : 'medium'} tone={sel ? 'buy' : 'secondary'}>{r}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        <Field label="Max drawdown" value={maxDrawdown} onChangeText={setMaxDrawdown} placeholder="e.g. 10-15%" />
        <Field label="Recommended capital" value={recommendedCapital} onChangeText={setRecommendedCapital} placeholder="e.g. $500" />
        <Field label="Avg trades / month" value={avgTrades} onChangeText={setAvgTrades} placeholder="e.g. 10-40" />
        <Field label="Expected returns" value={expectedReturns} onChangeText={setExpectedReturns} placeholder="e.g. ~3-5% monthly" />
        <Field label="Strategy description" value={strategyDescription} onChangeText={setStrategyDescription} multiline placeholder="Approach, indicators, market conditions…" />

        {error ? <Text variant="body" tone="sell">{error}</Text> : null}
        <Button onPress={submit} loading={submitting}>Submit application</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing[1] }}>
      <Text variant="body" tone="tertiary">{label}</Text>
      <Text variant="bodyMd" weight="medium" style={{ textTransform: 'capitalize' }}>{value}</Text>
    </View>
  );
}

/* ───────────────────────── My Dashboard Tab ───────────────────────── */
function MyDashboardTab({ theme }: { theme: Theme }) {
  const [data, setData] = useState<ProviderApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState<Follower[] | null>(null);
  const [followersLoading, setFollowersLoading] = useState(false);

  const loadFollowers = useCallback(async () => {
    setFollowersLoading(true);
    try {
      const res = await socialApi.myFollowers();
      setFollowers(res?.followers ?? []);
    } catch {
      setFollowers([]);
    } finally {
      setFollowersLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await socialApi.myProvider();
        setData(res && res.status ? res : null);
        if (res?.status === 'approved') void loadFollowers();
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadFollowers]);

  if (loading) {
    return <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={4} /></View>;
  }

  if (!data || data.status !== 'approved') {
    return (
      <View style={{ padding: theme.spacing[6] }}>
        <Text variant="bodyMd" tone="tertiary" align="center">
          You are not an approved MAM master. Apply in the “Become Master” tab.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing[4], paddingBottom: theme.spacing[10], gap: theme.spacing[3] }}>
      <Text variant="bodyLg" weight="bold">Master Dashboard</Text>

      <Text variant="label" tone="tertiary">OVERVIEW</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[4] }}>
        <StatBox label="Followers" value={data.followers_count ?? 0} digits={0} theme={theme} />
        <StatBox label="Active investors" value={data.active_investors ?? 0} digits={0} theme={theme} />
        <StatBox label="Total AUM" value={data.total_aum ?? 0} prefix="$" theme={theme} />
        <StatBox label="Open positions" value={data.open_positions ?? 0} digits={0} theme={theme} />
      </View>
      <Divider />

      <Text variant="label" tone="tertiary">EARNINGS & PROFIT SHARING</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[4] }}>
        <StatBox label="Commission earned" value={data.commission_earned ?? 0} prefix="$" theme={theme} />
        <StatBox label="Perf fee" value={data.performance_fee_pct ?? 0} suffix="%" theme={theme} />
        <StatBox label="Investor profit" tone="pnl" value={data.total_investor_profit ?? 0} prefix="$" theme={theme} />
        <StatBox label="Mgmt fee" value={data.management_fee_pct ?? 0} suffix="%" theme={theme} />
      </View>
      <Divider />

      <Text variant="label" tone="tertiary">TRADING ACTIVITY</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[4] }}>
        <StatBox label="Today trades" value={data.today_trades ?? 0} digits={0} theme={theme} />
        <StatBox label="Today profit" tone="pnl" value={data.today_profit ?? 0} prefix="$" theme={theme} />
        <StatBox label="Total trades" value={data.total_trades ?? 0} digits={0} theme={theme} />
        <StatBox label="Win rate" value={data.win_rate ?? 0} suffix="%" theme={theme} />
      </View>
      <Divider />

      <Text variant="label" tone="tertiary">PERFORMANCE</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[4] }}>
        <StatBox label="Total return" tone="pnl" value={data.total_return_pct ?? 0} suffix="%" theme={theme} />
        <StatBox label="Max DD" tone="sell" value={data.max_drawdown_pct ?? 0} suffix="%" theme={theme} />
        <StatBox label="Sharpe" value={data.sharpe_ratio ?? 0} theme={theme} />
        <StatBox label="Total profit" tone="pnl" value={data.total_profit ?? 0} prefix="$" theme={theme} />
        <StatBox label="Min investment" value={data.min_investment ?? 0} prefix="$" theme={theme} />
      </View>
      <Divider />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="label" tone="tertiary">MY FOLLOWERS</Text>
        <Button size="sm" variant="secondary" fullWidth={false} onPress={() => void loadFollowers()}>
          {followersLoading ? 'Loading…' : 'Refresh'}
        </Button>
      </View>
      {followers === null ? (
        <SkeletonRow count={2} />
      ) : followers.length === 0 ? (
        <Text variant="body" tone="tertiary" align="center">No followers yet.</Text>
      ) : (
        followers.map((f) => (
          <View key={f.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing[2] }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMd" weight="medium" numberOfLines={1}>{f.user_name ?? f.user_id}</Text>
                <Text variant="body" tone="tertiary" numberOfLines={1}>
                  ${f.allocation_amount.toLocaleString()} · {f.account_number ?? '—'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Money value={f.total_profit} pnl variant="bodyMd" />
                <Num value={f.profit_pct} digits={2} suffix="%" pnl signed variant="caption" />
              </View>
            </View>
            <Divider />
          </View>
        ))
      )}
    </ScrollView>
  );
}
