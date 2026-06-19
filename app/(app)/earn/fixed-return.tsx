import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Text, Num, Divider, Field, Button, Pressable, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import {
  fixedReturnApi,
  type FixedReturnConfig,
  type FixedReturnLock,
  type FixedReturnTierDef,
  type FixedReturnTenure,
} from '@/lib/api/earn';
import { ProfileHeader } from '../profile';

// The backend config returns tiers[] (with min_amount), tenures[] and a
// rate_matrix_pct[tenureIdx][tierIdx]. Cells are PER-MONTH percentages; the
// tenure decides the payout cadence (monthsPerCycle) and lock_months drives
// the total — identical contract to the web calculator.
function isMatrixConfig(c: FixedReturnConfig | null): c is FixedReturnConfig & {
  tiers: FixedReturnTierDef[];
  tenures: FixedReturnTenure[];
  rate_matrix_pct: number[][];
} {
  return !!c
    && Array.isArray(c.tenures) && c.tenures.length > 0
    && Array.isArray(c.rate_matrix_pct) && c.rate_matrix_pct.length > 0
    && Array.isArray(c.tiers) && c.tiers.length > 0
    && typeof (c.tiers[0] as FixedReturnTierDef).min_amount === 'number';
}

/** Months covered by one payout cycle for a tenure (mirrors the web). */
function monthsPerCycleFor(days: number): number {
  if (days >= 700) return 24;
  if (days >= 350) return 12;
  if (days >= 170) return 6;
  if (days >= 80) return 3;
  return 1;
}

const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FixedReturnScreen() {
  const theme = useTheme();
  const [cfg, setCfg] = useState<FixedReturnConfig | null>(null);
  const [locks, setLocks] = useState<FixedReturnLock[] | null>(null);
  const [amount, setAmount] = useState('1000');
  const [tenure, setTenure] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllRates, setShowAllRates] = useState(false);

  const load = async () => {
    const c = await fixedReturnApi.config().catch(() => null);
    setCfg(c);
    setLocks(await fixedReturnApi.locks().catch(() => []));
    if (c && isMatrixConfig(c) && !tenure) setTenure(c.tenures[0]?.label ?? '');
  };
  useEffect(() => { void load(); }, []);

  const principal = useMemo(() => {
    const n = parseFloat(amount);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amount]);

  const matrix = isMatrixConfig(cfg) ? cfg : null;

  const tierIdx = useMemo(() => {
    if (!matrix) return -1;
    let idx = -1;
    matrix.tiers.forEach((t, i) => { if (principal >= t.min_amount) idx = i; });
    return idx;
  }, [matrix, principal]);

  // For display we always want a tier (entry tier when below minimum) so the
  // user sees a real rate/projection even before they top up.
  const displayTierIdx = tierIdx >= 0 ? tierIdx : 0;

  const tenureIdx = useMemo(
    () => (matrix ? matrix.tenures.findIndex((t) => t.label === tenure) : -1),
    [matrix, tenure],
  );

  const ratePct = useMemo(() => {
    if (!matrix || tenureIdx < 0) return 0;
    return matrix.rate_matrix_pct[tenureIdx]?.[displayTierIdx] ?? 0;
  }, [matrix, displayTierIdx, tenureIdx]);

  const lockMonths = matrix?.lock_months ?? 12;
  const monthsPerCycle = matrix && tenureIdx >= 0 ? monthsPerCycleFor(matrix.tenures[tenureIdx]!.days) : 1;
  const cycles = Math.max(1, Math.floor(lockMonths / monthsPerCycle));

  const projection = useMemo(() => {
    if (!matrix || ratePct <= 0 || principal <= 0) return { total: 0, payout: principal };
    const total = principal * (ratePct / 100) * lockMonths;
    return { total, payout: principal + total };
  }, [matrix, ratePct, principal, lockMonths]);

  const minAmount = matrix?.tiers[0]?.min_amount ?? 0;
  const eligible = principal >= minAmount && tenureIdx >= 0;

  // "add $X → next tier" nudge.
  const nextTierHint = useMemo(() => {
    if (!matrix) return '';
    const next = matrix.tiers[displayTierIdx + 1];
    if (!next) return '';
    const need = next.min_amount - principal;
    if (need <= 0) return '';
    const nextRate = matrix.rate_matrix_pct[tenureIdx >= 0 ? tenureIdx : 0]?.[displayTierIdx + 1] ?? 0;
    return `Add ${usd(need)} → ${next.label} at ${nextRate.toFixed(2)}%/mo`;
  }, [matrix, displayTierIdx, principal, tenureIdx]);

  const onLock = async () => {
    setError(null);
    if (!matrix) return;
    if (!eligible) return setError(`Minimum lock amount is ${usd(minAmount)}.`);
    setSubmitting(true);
    try {
      await fixedReturnApi.lock({
        amount: principal,
        tenure,
        tier: matrix.tiers[displayTierIdx]?.label,
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lock failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const onWithdraw = (l: FixedReturnLock) => {
    const matured = l.matures_at && new Date(l.matures_at).getTime() <= Date.now();
    Alert.alert(
      matured ? 'Claim principal?' : 'Request early withdrawal?',
      matured
        ? `You'll receive your ${usd(l.principal)} principal back.`
        : `A ${(cfg?.early_withdrawal_fee_pct ?? 0).toFixed(1)}% penalty applies and accrued interest claws back. The request goes to admin for approval.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: matured ? 'Claim' : 'Request',
          onPress: async () => {
            setBusyId(l.id);
            try {
              await fixedReturnApi.withdrawLock(l.id);
              await load();
            } catch (e: unknown) {
              Alert.alert('Failed', e instanceof Error ? e.message : 'Withdrawal failed.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Fixed return' }} />
      <ProfileHeader title="Fixed return" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[10] }} keyboardShouldPersistTaps="handled">
          {cfg === null ? (
            <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={4} /></View>
          ) : matrix ? (
            <>
              <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[3], paddingBottom: theme.spacing[1] }}>
                <Text variant="bodyMd" tone="secondary">
                  Lock funds for a fixed term and earn a guaranteed return. Pick a term, enter your amount, and see your payout instantly.
                </Text>
              </View>

              {/* 1 · Term selector */}
              <SectionLabel theme={theme} text="1 · CHOOSE A TERM" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: theme.spacing[4], gap: theme.spacing[2], paddingVertical: theme.spacing[2] }}
              >
                {matrix.tenures.map((tn, ti) => {
                  const sel = tn.label === tenure;
                  const r = matrix.rate_matrix_pct[ti]?.[displayTierIdx] ?? 0;
                  return (
                    <Pressable
                      key={tn.label}
                      onPress={() => setTenure(tn.label)}
                      haptic="light"
                      style={({ pressed }) => ({
                        width: 132,
                        padding: theme.spacing[3],
                        borderRadius: theme.radius.lg,
                        borderWidth: 1,
                        borderColor: sel ? theme.colors.buy : theme.colors.border.primary,
                        backgroundColor: sel ? theme.colors.buyBg : pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                        gap: 2,
                      })}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text variant="bodyMd" weight="bold">{tn.label}</Text>
                        {sel ? <Check size={14} color={theme.colors.buy} strokeWidth={3} /> : null}
                      </View>
                      <Text variant="caption" tone="tertiary">every {tn.days} days</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 2 }}>
                        <Text variant="numLg" weight="bold" tone={sel ? 'accent' : 'primary'}>{r.toFixed(2)}%</Text>
                        <Text variant="caption" tone="tertiary">/mo</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* 2 · Deposit */}
              <SectionLabel theme={theme} text="2 · YOUR DEPOSIT" />
              <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[2], gap: theme.spacing[3] }}>
                <Field
                  label="Principal (USD)"
                  hint={`Minimum ${usd(minAmount)}`}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  editable={!submitting}
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] }}>
                  {matrix.tiers.map((t, i) => {
                    const selT = i === tierIdx;
                    return (
                      <Pressable
                        key={t.label}
                        onPress={() => setAmount(String(t.min_amount))}
                        haptic="light"
                        style={({ pressed }) => ({
                          paddingHorizontal: theme.spacing[3],
                          paddingVertical: theme.spacing[1] + 2,
                          borderRadius: theme.radius.pill,
                          borderWidth: 1,
                          borderColor: selT ? theme.colors.buy : theme.colors.border.primary,
                          backgroundColor: selT ? theme.colors.buyBg : pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                        })}
                      >
                        <Text variant="labelXs" weight={selT ? 'bold' : 'medium'} tone={selT ? 'accent' : 'secondary'}>{t.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text variant="body" tone="tertiary">
                  Your tier: <Text variant="body" weight="bold" tone="accent">{matrix.tiers[displayTierIdx]?.label}</Text>
                  {`  ·  ${ratePct.toFixed(2)}%/mo`}
                  {nextTierHint ? `\n${nextTierHint}` : ''}
                </Text>
              </View>

              {/* Result card */}
              <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[3] }}>
                <View
                  style={{
                    padding: theme.spacing[4],
                    borderRadius: theme.radius.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.border.accent,
                    backgroundColor: theme.colors.bg.secondary,
                    gap: theme.spacing[2],
                  }}
                >
                  <Text variant="labelXs" tone="tertiary">YOU RECEIVE AT MATURITY</Text>
                  <Text variant="numXxl" weight="bold" tone="buy">{usd(projection.payout)}</Text>
                  <Divider />
                  <ResultRow theme={theme} label="Principal" value={usd(principal)} />
                  <ResultRow theme={theme} label="Rate" value={`${ratePct.toFixed(2)}% / month`} valueTone="accent" />
                  <ResultRow theme={theme} label="Term" value={`${tenure} · ${cycles} ${cycles === 1 ? 'cycle' : 'cycles'}`} />
                  <ResultRow theme={theme} label="Lock period" value={`${lockMonths} months`} />
                  <ResultRow theme={theme} label="Interest earned" value={`+${usd(projection.total)}`} valueTone="buy" />
                  <ResultRow theme={theme} label="Early-withdrawal fee" value={`${cfg.early_withdrawal_fee_pct.toFixed(1)}%`} valueTone="sell" />
                </View>
              </View>

              {error ? (
                <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[2] }}>
                  <Text variant="body" tone="sell">{error}</Text>
                </View>
              ) : null}

              <View style={{ padding: theme.spacing[4] }}>
                <Button onPress={onLock} loading={submitting} disabled={!eligible} size="lg">
                  {eligible ? `Lock ${usd(principal)}` : `Minimum ${usd(minAmount)} to lock`}
                </Button>
              </View>

              {/* Collapsible full rate table */}
              <Pressable
                onPress={() => setShowAllRates((v) => !v)}
                haptic="light"
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}
              >
                <Text variant="label" tone="tertiary">ALL RATES (% PER MONTH)</Text>
                {showAllRates
                  ? <ChevronUp size={16} color={theme.colors.text.tertiary} />
                  : <ChevronDown size={16} color={theme.colors.text.tertiary} />}
              </Pressable>
              {showAllRates ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[3] }}>
                  <View>
                    <View style={{ flexDirection: 'row' }}>
                      <Cell theme={theme} w={96} text="Term" header />
                      {matrix.tiers.map((t) => <Cell key={t.label} theme={theme} text={t.label} header />)}
                    </View>
                    {matrix.tenures.map((tn, ti) => (
                      <View key={tn.label} style={{ flexDirection: 'row' }}>
                        <Cell theme={theme} w={96} text={tn.label} rowHead />
                        {matrix.tiers.map((t, ci) => (
                          <Cell
                            key={t.label}
                            theme={theme}
                            text={`${(matrix.rate_matrix_pct[ti]?.[ci] ?? 0).toFixed(2)}%`}
                            highlight={ti === tenureIdx && ci === displayTierIdx}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : null}
            </>
          ) : cfg ? (
            <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
              <Text variant="body" tone="tertiary">Rates unavailable. Early withdrawal fee: {cfg.early_withdrawal_fee_pct.toFixed(1)}%</Text>
            </View>
          ) : null}

          {/* My locks */}
          <SectionLabel theme={theme} text="MY LOCKS" />
          <Divider />
          {locks === null ? (
            <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={2} /></View>
          ) : locks.length === 0 ? (
            <View style={{ padding: theme.spacing[6] }}>
              <Text variant="bodyMd" tone="tertiary" align="center">No active locks.</Text>
            </View>
          ) : (
            locks.map((l) => {
              const status = l.state ?? l.status;
              const interest = l.interest_to_date ?? l.total_interest_paid ?? l.accrued_interest;
              const isActive = status === 'active';
              const matured = !!l.matures_at && new Date(l.matures_at).getTime() <= Date.now();
              return (
                <View key={l.id}>
                  <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="bodyMd" weight="medium">{usd(l.principal)} · {l.tenure_label}</Text>
                      <Text variant="labelXs" tone={isActive ? 'accent' : 'tertiary'}>{String(status).replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    <Text variant="body" tone="tertiary">
                      +{usd(interest)} interest · matures {format(new Date(l.matures_at), 'MMM d, yyyy')}
                    </Text>
                    {isActive ? (
                      <View style={{ marginTop: theme.spacing[2] }}>
                        <Button size="sm" variant="secondary" fullWidth={false} loading={busyId === l.id} onPress={() => onWithdraw(l)}>
                          {matured ? 'Claim principal' : 'Request early withdrawal'}
                        </Button>
                      </View>
                    ) : null}
                  </View>
                  <Divider inset={theme.spacing[4]} />
                </View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionLabel({ theme, text }: { theme: ReturnType<typeof useTheme>; text: string }) {
  return (
    <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[4], paddingBottom: theme.spacing[1] }}>
      <Text variant="label" tone="tertiary">{text}</Text>
    </View>
  );
}

function ResultRow({ theme, label, value, valueTone }: {
  theme: ReturnType<typeof useTheme>;
  label: string;
  value: string;
  valueTone?: 'buy' | 'sell' | 'accent';
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text variant="bodyMd" tone="secondary">{label}</Text>
      <Text variant="bodyMd" weight="bold" tone={valueTone ?? 'primary'}>{value}</Text>
    </View>
  );
}

function Cell({ theme, text, w = 64, header, rowHead, highlight }: {
  theme: ReturnType<typeof useTheme>;
  text: string;
  w?: number;
  header?: boolean;
  rowHead?: boolean;
  highlight?: boolean;
}) {
  return (
    <View
      style={{
        width: w,
        paddingVertical: theme.spacing[2],
        paddingHorizontal: theme.spacing[1],
        alignItems: header || rowHead ? 'flex-start' : 'center',
        justifyContent: 'center',
        backgroundColor: highlight ? theme.colors.buyBg : 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.primary,
      }}
    >
      <Text
        variant={header || rowHead ? 'labelXs' : 'caption'}
        weight={header || rowHead || highlight ? 'bold' : 'regular'}
        tone={highlight ? 'buy' : header || rowHead ? 'secondary' : 'tertiary'}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}
