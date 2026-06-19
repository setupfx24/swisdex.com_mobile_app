import { useEffect, useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import * as SecureStore from 'expo-secure-store';
import { HelpCircle, Wallet, CheckCircle2 } from 'lucide-react-native';
import { Text, Num, Divider, Button, Pressable, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import {
  insuranceApi,
  insuranceReasonLabel,
  insuranceTierLabel,
  type InsurancePolicy,
  type InsuranceClaim,
  type InsuranceTierQuote,
} from '@/lib/api/earn';
import { positionsApi } from '@/lib/api/positions';
import { useAccountsStore } from '@/stores/accountsStore';
import type { Position } from '@/types/trading';
import { InsuranceOnboardingModal } from '@/features/insurance/InsuranceOnboardingModal';
import { ProfileHeader } from '../profile';

const ONBOARD_KEY = 'swisdex.insurance_onboarded';

type Tone = 'buy' | 'sell' | 'tertiary' | 'accent';
function statusTone(status: string): Tone {
  switch (status) {
    case 'active': return 'accent';
    case 'claimed': return 'buy';
    case 'denied': return 'sell';
    case 'expired': return 'tertiary';
    default: return 'tertiary';
  }
}

function toArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object' && Array.isArray((res as { items?: T[] }).items)) {
    return (res as { items: T[] }).items;
  }
  return [];
}

const n = (v: string | number | null | undefined) => Number(v ?? 0);

/** Safe date formatter. date-fns `format()` THROWS "Invalid time value" on an
 *  invalid Date (e.g. new Date(undefined)) — in a release APK that throw is
 *  uncaught and hard-crashes the app (the dev red-box silently recovers, which
 *  is why it "worked" in Expo Go). Always go through this. */
function fmtDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : format(d, 'MMM d, yyyy · HH:mm');
}

export default function InsuranceScreen() {
  const theme = useTheme();
  const active = useAccountsStore((s) => s.active);
  const [policies, setPolicies] = useState<InsurancePolicy[] | null>(null);
  const [claims, setClaims] = useState<InsuranceClaim[] | null>(null);
  const [openPositions, setOpenPositions] = useState<Position[] | null>(null);
  const [posId, setPosId] = useState('');
  const [quotes, setQuotes] = useState<InsuranceTierQuote[] | null>(null);
  const [tier, setTier] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [activating, setActivating] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onboard, setOnboard] = useState(false);

  // First visit → show the "How it works" wizard once (persisted in SecureStore).
  useEffect(() => {
    SecureStore.getItemAsync(ONBOARD_KEY)
      .then((v) => { if (v !== '1') setOnboard(true); })
      .catch(() => {});
  }, []);
  const closeOnboard = () => {
    setOnboard(false);
    SecureStore.setItemAsync(ONBOARD_KEY, '1').catch(() => {});
  };

  const load = async () => {
    insuranceApi.policies().then((r) => setPolicies(toArray<InsurancePolicy>(r))).catch(() => setPolicies([]));
    insuranceApi.claims().then((r) => setClaims(toArray<InsuranceClaim>(r))).catch(() => setClaims([]));
    if (active) {
      positionsApi.list(active.id, 'open').then(setOpenPositions).catch(() => setOpenPositions([]));
    } else {
      setOpenPositions([]);
    }
  };
  useEffect(() => { void load(); }, [active?.id]);

  const selectedPos = openPositions?.find((p) => p.id === posId) ?? null;

  const pendingClaims = (claims ?? []).filter((c) => c.status === 'pending');
  const paidClaims = (claims ?? []).filter((c) => c.status === 'paid');
  const totalClaimable = pendingClaims.reduce((s, c) => s + n(c.claim_amount), 0);
  const totalClaimed = paidClaims.reduce((s, c) => s + n(c.claim_amount), 0);
  const activeCount = (policies ?? []).filter((p) => p.status === 'active').length;

  const onQuote = async (p: Position) => {
    setError(null);
    setPosId(p.id);
    setQuotes(null);
    setTier('');
    if (!active) return;
    setQuoting(true);
    try {
      const q = await insuranceApi.quote({
        account_id: active.id,
        symbol: p.symbol,
        side: p.side as 'buy' | 'sell',
        lots: p.lots,
        leverage: active.leverage,
        ...(p.stop_loss != null ? { stop_loss: p.stop_loss } : {}),
        ...(p.take_profit != null ? { take_profit: p.take_profit } : {}),
      });
      setQuotes(q);
      if (q.length > 0) setTier(q[0]!.tier);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not fetch a quote.');
    } finally {
      setQuoting(false);
    }
  };

  const onActivate = async () => {
    setError(null);
    if (!selectedPos || !tier) return setError('Pick a position and tier first.');
    setActivating(true);
    try {
      await insuranceApi.activate({ position_id: selectedPos.id, tier });
      setPosId('');
      setQuotes(null);
      setTier('');
      await load();
      Alert.alert('Insured', 'Your position is now covered.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not activate coverage.');
    } finally {
      setActivating(false);
    }
  };

  const onClaim = async (claimId: string) => {
    setClaimingId(claimId);
    try {
      const res = await insuranceApi.claim(claimId);
      const amt = Number(res.amount ?? 0).toFixed(2);
      Alert.alert(
        'Payout claimed',
        res.credited_to === 'credit'
          ? `$${amt} credited to your trading credit (tradable).`
          : `$${amt} credited to your main balance.`,
      );
      await load();
    } catch (e: unknown) {
      Alert.alert('Not yet', e instanceof Error ? e.message : 'Cannot claim.');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Insurance' }} />
      <ProfileHeader title="Trade Insurance" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[10] }} keyboardShouldPersistTaps="handled">
        {/* Subtitle + How it works */}
        <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[3], gap: theme.spacing[3] }}>
          <Text variant="bodyMd" tone="secondary">
            Per-trade protection. Pay a small fee to recover part of any loss on insured trades.
          </Text>
          <Pressable
            onPress={() => setOnboard(true)}
            haptic="light"
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 6,
              alignSelf: 'flex-start',
              paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[2],
              borderRadius: theme.radius.md,
              borderWidth: 1, borderColor: theme.colors.border.primary,
              backgroundColor: pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
            })}
          >
            <HelpCircle size={15} color={theme.colors.buy} strokeWidth={2} />
            <Text variant="bodyMd" weight="medium">How it works</Text>
          </Pressable>
        </View>

        {/* Summary stat cards */}
        <View style={{ flexDirection: 'row', gap: theme.spacing[2], paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[4] }}>
          <StatCard
            theme={theme}
            label="CLAIMABLE"
            value={`$${totalClaimable.toFixed(2)}`}
            sub={pendingClaims.length ? `${pendingClaims.length} payout(s) waiting` : 'none yet'}
            valueTone={pendingClaims.length ? 'accent' : 'tertiary'}
          />
          <StatCard
            theme={theme}
            label="TOTAL CLAIMED"
            value={`$${totalClaimed.toFixed(2)}`}
            sub={paidClaims.length ? `across ${paidClaims.length} payout(s)` : 'no payouts yet'}
            valueTone="buy"
          />
          <StatCard
            theme={theme}
            label="POLICIES"
            value={String(policies?.length ?? 0)}
            sub={`${activeCount} active`}
            valueTone="primary"
          />
        </View>

        {/* Claimable */}
        <Section label={`CLAIMABLE${pendingClaims.length ? ` (${pendingClaims.length})` : ''}`} theme={theme}>
          {claims === null ? (
            <SkeletonRow count={2} />
          ) : pendingClaims.length === 0 ? (
            <Text variant="bodyMd" tone="tertiary" align="center">
              No payouts waiting. When an insured trade closes in eligible loss, the payout appears here for you to claim.
            </Text>
          ) : (
            <>
              {pendingClaims.map((c) => (
                <View key={c.id}>
                  <View style={{ paddingVertical: theme.spacing[3], flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
                    <View
                      style={{
                        paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.radius.sm,
                        backgroundColor: theme.colors.buyBg,
                      }}
                    >
                      <Text variant="caption" weight="bold" tone="accent">PENDING</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMd" weight="semibold">
                        {c.instrument_symbol ?? '—'} · {insuranceTierLabel(c.tier)}
                      </Text>
                      <Text variant="caption" tone="tertiary">Loss ${n(c.loss_amount).toFixed(2)}</Text>
                    </View>
                    <Text variant="numLg" tone="buy">${n(c.claim_amount).toFixed(2)}</Text>
                    <Button
                      size="sm"
                      fullWidth={false}
                      loading={claimingId === c.id}
                      onPress={() => onClaim(c.id)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Wallet size={13} color="#FFFFFF" />
                        <Text variant="bodyMd" weight="bold" style={{ color: '#FFFFFF', fontSize: 13 }}>Claim</Text>
                      </View>
                    </Button>
                  </View>
                  <Divider />
                </View>
              ))}
              <Text variant="caption" tone="tertiary" style={{ paddingTop: theme.spacing[2] }}>
                Claimed funds are credited to your trading credit — tradable, not withdrawable.
              </Text>
            </>
          )}
        </Section>

        {/* Insure a position (mobile equivalent of the web order-ticket toggle) */}
        <Section label="INSURE A POSITION" theme={theme}>
          {openPositions === null ? (
            <SkeletonRow count={2} />
          ) : openPositions.length === 0 ? (
            <Text variant="bodyMd" tone="tertiary" align="center">No open positions to insure.</Text>
          ) : (
            openPositions.map((p) => {
              const sel = p.id === posId;
              return (
                <View key={p.id}>
                  <Pressable
                    onPress={() => onQuote(p)}
                    haptic="light"
                    style={({ pressed }) => ({
                      paddingVertical: theme.spacing[3],
                      paddingHorizontal: theme.spacing[2],
                      marginHorizontal: -theme.spacing[2],
                      borderRadius: theme.radius.md,
                      backgroundColor: sel ? theme.colors.buyBg : pressed ? theme.colors.bg.hover : 'transparent',
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    })}
                  >
                    <View>
                      <Text variant="bodyMd" weight={sel ? 'bold' : 'medium'}>
                        {p.symbol} · {p.side.toUpperCase()} {p.lots}
                      </Text>
                      <Text variant="body" tone="tertiary">@ {p.open_price}</Text>
                    </View>
                    <Num value={p.profit} digits={2} pnl signed variant="num" />
                  </Pressable>
                  <Divider inset={theme.spacing[2]} />
                </View>
              );
            })
          )}
        </Section>

        {selectedPos ? (
          <>
            <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2] }}>
              <Text variant="label" tone="tertiary">PICK A TIER — {selectedPos.symbol}</Text>
            </View>
            <Divider />
            <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
              {quoting ? (
                <SkeletonRow count={3} />
              ) : quotes === null ? (
                <Text variant="body" tone="tertiary">Select a position above to load quotes.</Text>
              ) : quotes.length === 0 ? (
                <Text variant="body" tone="tertiary">No tiers available for this position.</Text>
              ) : (
                <View style={{ gap: theme.spacing[2] }}>
                  {quotes.map((q) => {
                    const sel = q.tier === tier;
                    return (
                      <Pressable
                        key={q.tier}
                        onPress={() => setTier(q.tier)}
                        haptic="light"
                        style={({ pressed }) => ({
                          padding: theme.spacing[3],
                          borderRadius: theme.radius.md,
                          borderWidth: 1,
                          borderColor: sel ? theme.colors.buy : theme.colors.border.primary,
                          backgroundColor: sel ? theme.colors.buyBg : pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                        })}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text variant="bodyMd" weight="bold">{insuranceTierLabel(q.tier)}</Text>
                          <Text variant="bodyMd" tone="primary">${q.fee.toFixed(2)} fee</Text>
                        </View>
                        <Text variant="body" tone="tertiary">
                          {q.coverage_pct.toFixed(0)}% covered · max ${q.max_cap.toFixed(0)}
                          {q.estimated_refund > 0 ? ` · ~$${q.estimated_refund.toFixed(2)} if SL hits` : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              {error ? <Text variant="body" tone="sell">{error}</Text> : null}
              {quotes && quotes.length > 0 ? (
                <>
                  <Button onPress={onActivate} loading={activating}>Activate coverage</Button>
                  <Text variant="caption" tone="tertiary">
                    The fee will be charged from your main wallet after coverage activates.
                  </Text>
                </>
              ) : null}
            </View>
          </>
        ) : null}

        {/* Policies */}
        <Section label="POLICIES" theme={theme}>
          {policies === null ? (
            <SkeletonRow count={3} />
          ) : policies.length === 0 ? (
            <Text variant="bodyMd" tone="tertiary" align="center">
              You have no insurance policies yet. Activate insurance from an open position above.
            </Text>
          ) : (
            policies.map((p) => {
              const sym = p.instrument_symbol ?? p.symbol ?? '—';
              const tone = statusTone(p.status);
              const reason = insuranceReasonLabel(p.settled_reason);
              const ended = p.status !== 'active' && p.settled_at;
              return (
                <View key={p.id}>
                  <View style={{ paddingVertical: theme.spacing[3], gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], flex: 1 }}>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: theme.radius.sm,
                            backgroundColor:
                              tone === 'sell' ? theme.colors.sellBg
                              : tone === 'buy' || tone === 'accent' ? theme.colors.buyBg
                              : theme.colors.bg.chip,
                          }}
                        >
                          <Text variant="caption" weight="bold" tone={tone === 'tertiary' ? 'tertiary' : tone}>
                            {p.status.toUpperCase()}
                          </Text>
                        </View>
                        <Text variant="bodyMd" weight="medium">{sym}</Text>
                        <Text variant="labelXs" tone="accent">{insuranceTierLabel(p.tier)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="bodyB" tone="primary">${p.fee.toFixed(2)} fee</Text>
                        <Text variant="caption" tone="tertiary">
                          {p.coverage_pct.toFixed(0)}% covered · max ${p.max_cap.toFixed(0)}
                        </Text>
                      </View>
                    </View>

                    {reason && (p.status === 'denied' || p.status === 'expired') ? (
                      <Text variant="body" tone="sell">
                        {p.status === 'denied' ? 'Reason: ' : 'Reason: '}{reason}
                      </Text>
                    ) : null}

                    {ended ? (
                      <Text variant="caption" tone="tertiary">
                        {p.status === 'expired' ? 'Expired ' : 'Settled '}
                        {fmtDateTime(p.settled_at)}
                      </Text>
                    ) : (
                      <Text variant="caption" tone="tertiary">
                        Activated {fmtDateTime(p.activated_at)}
                      </Text>
                    )}
                  </View>
                  <Divider />
                </View>
              );
            })
          )}
        </Section>

        {/* Claim history */}
        <Section label="CLAIM HISTORY" theme={theme}>
          {claims === null ? (
            <SkeletonRow count={2} />
          ) : paidClaims.length === 0 ? (
            <Text variant="bodyMd" tone="tertiary" align="center">
              No claims yet. When you press Claim above, the payout will appear here.
            </Text>
          ) : (
            paidClaims.map((c) => (
              <View key={c.id}>
                <View style={{ paddingVertical: theme.spacing[3], flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[2] }}>
                  <CheckCircle2 size={16} color={theme.colors.buy} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMd">
                      {c.instrument_symbol ?? '—'} · {insuranceTierLabel(c.tier)} · Loss ${n(c.loss_amount).toFixed(2)} → payout{' '}
                      <Text variant="bodyMd" weight="bold" tone="buy">${n(c.claim_amount).toFixed(2)}</Text>
                    </Text>
                    <Text variant="caption" tone="tertiary">
                      {fmtDateTime(c.paid_at)}
                    </Text>
                  </View>
                </View>
                <Divider />
              </View>
            ))
          )}
        </Section>
      </ScrollView>

      <InsuranceOnboardingModal visible={onboard} onClose={closeOnboard} />
    </SafeAreaView>
  );
}

function StatCard({
  theme, label, value, sub, valueTone,
}: {
  theme: ReturnType<typeof useTheme>;
  label: string;
  value: string;
  sub: string;
  valueTone: 'accent' | 'buy' | 'primary' | 'tertiary';
}) {
  return (
    <View
      style={{
        flex: 1,
        padding: theme.spacing[3],
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
        backgroundColor: theme.colors.bg.secondary,
        gap: 2,
      }}
    >
      <Text variant="labelXs" tone="tertiary">{label}</Text>
      <Text variant="numLg" tone={valueTone} weight="bold" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text variant="caption" tone="tertiary" numberOfLines={1}>{sub}</Text>
    </View>
  );
}

function Section({ label, theme, children }: { label: string; theme: ReturnType<typeof useTheme>; children: React.ReactNode }) {
  return (
    <>
      <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[5], paddingBottom: theme.spacing[2] }}>
        <Text variant="label" tone="tertiary">{label}</Text>
      </View>
      <Divider />
      <View style={{ paddingHorizontal: theme.spacing[4] }}>{children}</View>
      <View style={{ height: theme.spacing[3] }} />
    </>
  );
}
