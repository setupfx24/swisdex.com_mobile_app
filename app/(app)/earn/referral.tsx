import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Copy, Share2, Check, ChevronRight, Wallet } from 'lucide-react-native';
import { Text, Divider, Button, Pressable, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import {
  referralApi,
  type ReferralDashboard,
  type ReferralListResponse,
  type ReferralRow,
  type ReferralRowStatus,
} from '@/lib/api/earn';
import { ProfileHeader } from '../profile';

const REGISTER_BASE = 'https://swisdex.com/auth/register?ref=';
const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const BADGE: Record<ReferralRowStatus, { label: string; tone: 'warning' | 'buy' | 'tertiary' }> = {
  pending: { label: 'PENDING', tone: 'warning' },
  claimable: { label: 'CLAIMABLE', tone: 'buy' },
  claimed: { label: 'CLAIMED', tone: 'tertiary' },
};

export default function ReferralScreen() {
  const theme = useTheme();
  const [head, setHead] = useState<ReferralDashboard | null>(null);
  const [list, setList] = useState<ReferralListResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    const [d, l] = await Promise.all([
      referralApi.dashboard().catch(() => null),
      referralApi.list().catch(() => null),
    ]);
    setHead(d);
    setList(l);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const code = head?.referral_code ?? '';
  const link = code ? `${REGISTER_BASE}${code}` : '';
  const balance = list?.commission_balance ?? 0;
  const nextBounty = list?.next_bounty ?? 0;
  const rows = list?.items ?? [];
  const requiredTrades = list?.required_trades ?? head?.required_trades ?? 3;
  const claimableCount = rows.filter((r) => r.status === 'claimable').length;

  const eligibilityText = `Eligible after ${requiredTrades} trades${list?.requires_kyc ? ' + KYC' : ''}${list?.requires_funded ? ' + first deposit' : ''}`;

  const copyLink = async () => {
    if (!link) return;
    await Clipboard.setStringAsync(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const shareLink = () => {
    if (!link) return;
    void Share.share({ message: `Trade with me on SwisDex — sign up: ${link}` });
  };

  const onClaim = async (r: ReferralRow) => {
    setClaimingId(r.user_id);
    try {
      const res = await referralApi.claim(r.user_id);
      await load();
      Alert.alert('Claimed', `$${fmt(Number(res.amount ?? 0))} added to your commission balance from ${r.name || r.email}.`);
    } catch (e: unknown) {
      Alert.alert('Could not claim', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setClaimingId(null);
    }
  };

  const onWithdraw = async () => {
    setWithdrawing(true);
    try {
      const res = await referralApi.withdraw();
      await load();
      Alert.alert('Withdrawn', `$${fmt(Number(res.amount ?? 0))} added to your main wallet.`);
    } catch (e: unknown) {
      Alert.alert('Could not withdraw', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Referral' }} />
      <ProfileHeader title="Referral" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[10] }}>
        {head === null && list === null ? (
          <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={4} /></View>
        ) : (
          <>
            {/* Blurb */}
            <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[3] }}>
              <Text variant="bodyMd" tone="secondary">
                Invite friends. They qualify after completing {requiredTrades} closed trades
                {list?.requires_kyc ? ' and approved KYC' : ''}. Claim each qualified referral to add their bounty to
                your commission balance, then withdraw to your main wallet.{' '}
                <Text variant="bodyMd" tone="accent" weight="medium" onPress={() => router.push('/business')}>
                  For multi-level commissions see Affiliates (IB).
                </Text>
              </Text>
            </View>

            {/* Stat cards (2×2) */}
            <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[4], gap: theme.spacing[3] }}>
              <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
                <StatCard theme={theme} label="TOTAL REFERRALS" value={String(head?.referrals ?? 0)} valueTone="accent" />
                <StatCard
                  theme={theme}
                  label="CLAIMABLE"
                  value={String(claimableCount)}
                  sub={claimableCount > 0 ? `next $${fmt(nextBounty)}` : 'none yet'}
                  valueTone="buy"
                />
              </View>
              <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
                <StatCard theme={theme} label="COMMISSION BALANCE" value={`$${fmt(balance)}`} sub="ready to withdraw" valueTone="buy" />
                <StatCard theme={theme} label="TOTAL EARNED" value={`$${fmt(head?.total_earned ?? 0)}`} valueTone="buy" />
              </View>
            </View>

            {/* Withdraw */}
            {balance > 0 ? (
              <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[3] }}>
                <View style={{ padding: theme.spacing[4], borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border.accent, backgroundColor: theme.colors.bg.secondary, gap: theme.spacing[2] }}>
                  <Text variant="labelXs" tone="tertiary">AVAILABLE COMMISSION</Text>
                  <Text variant="numXl" weight="bold" tone="buy">${fmt(balance)}</Text>
                  <Text variant="caption" tone="tertiary">Withdrawing moves the amount into your main wallet — appears in Transactions and a notification fires.</Text>
                  <Button onPress={onWithdraw} loading={withdrawing}>Withdraw to main wallet</Button>
                </View>
              </View>
            ) : null}

            {/* Referral link */}
            {code ? (
              <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[4] }}>
                <View style={{ padding: theme.spacing[4], borderRadius: theme.radius.lg, backgroundColor: theme.colors.bg.secondary, gap: theme.spacing[2] }}>
                  <Text variant="labelXs" tone="tertiary">YOUR REFERRAL LINK</Text>
                  <Text variant="body" tone="primary" selectable numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>{link}</Text>
                  <View style={{ flexDirection: 'row', gap: theme.spacing[2], paddingTop: theme.spacing[1] }}>
                    <Button variant="secondary" size="sm" fullWidth={false} onPress={copyLink}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {copied ? <Check size={14} color={theme.colors.buy} /> : <Copy size={14} color={theme.colors.text.primary} />}
                        <Text variant="bodyMd" weight="bold" style={{ fontSize: 13 }}>{copied ? 'Copied' : 'Copy link'}</Text>
                      </View>
                    </Button>
                    <Button variant="secondary" size="sm" fullWidth={false} onPress={shareLink}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Share2 size={14} color={theme.colors.buy} />
                        <Text variant="bodyMd" weight="bold" style={{ fontSize: 13 }}>Share</Text>
                      </View>
                    </Button>
                  </View>
                  <Divider />
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text variant="body" tone="tertiary">Code: <Text variant="body" weight="bold" tone="accent">{code}</Text></Text>
                    <Pressable onPress={() => router.push('/business')} haptic="light" style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Text variant="bodyMd" tone="accent" weight="medium">IB / Affiliates dashboard</Text>
                      <ChevronRight size={14} color={theme.colors.buy} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[3] }}>
                <Text variant="body" tone="tertiary">Your referral code is being generated. Pull to refresh in a moment.</Text>
              </View>
            )}

            {/* Friends */}
            <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[5], paddingBottom: theme.spacing[2], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="label" tone="tertiary">YOUR FRIENDS</Text>
              <Text variant="caption" tone="tertiary">{eligibilityText}</Text>
            </View>
            <Divider />
            {rows.length === 0 ? (
              <View style={{ padding: theme.spacing[6] }}>
                <Text variant="bodyMd" tone="tertiary" align="center">You haven&apos;t referred anyone yet. Share your link to get started.</Text>
              </View>
            ) : (
              rows.map((r) => {
                const tradesMet = r.trades >= requiredTrades;
                const badge = BADGE[r.status];
                return (
                  <View key={r.user_id}>
                    <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3], flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text variant="bodyMd" weight="semibold" numberOfLines={1}>{r.name || r.email}</Text>
                        {r.name ? <Text variant="caption" tone="tertiary" numberOfLines={1}>{r.email}</Text> : null}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], marginTop: 2 }}>
                          <Text variant="caption" tone={tradesMet ? 'buy' : 'tertiary'} style={{ fontVariant: ['tabular-nums'] }}>
                            {r.trades} / {requiredTrades} trades
                          </Text>
                          <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: theme.radius.sm, backgroundColor: badge.tone === 'buy' ? theme.colors.buyBg : badge.tone === 'warning' ? theme.colors.bg.chip : theme.colors.bg.chip }}>
                            <Text variant="labelXs" weight="bold" tone={badge.tone === 'tertiary' ? 'tertiary' : badge.tone}>{badge.label}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end', maxWidth: 150 }}>
                        {r.status === 'claimable' ? (
                          <Button size="sm" fullWidth={false} loading={claimingId === r.user_id} onPress={() => onClaim(r)}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Wallet size={13} color="#FFFFFF" />
                              <Text variant="bodyMd" weight="bold" style={{ color: '#FFFFFF', fontSize: 13 }}>Claim</Text>
                            </View>
                          </Button>
                        ) : r.status === 'claimed' ? (
                          <Text variant="caption" tone="tertiary">paid</Text>
                        ) : (
                          <Text variant="caption" tone="tertiary" align="right">
                            {r.pending_reason ?? `${Math.max(0, requiredTrades - r.trades)} trade(s) to go`}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Divider inset={theme.spacing[4]} />
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ theme, label, value, sub, valueTone }: {
  theme: ReturnType<typeof useTheme>;
  label: string;
  value: string;
  sub?: string;
  valueTone?: 'accent' | 'buy';
}) {
  return (
    <View style={{ flex: 1, padding: theme.spacing[3], borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border.primary, backgroundColor: theme.colors.bg.secondary, gap: 2 }}>
      <Text variant="labelXs" tone="tertiary" numberOfLines={1}>{label}</Text>
      <Text variant="numLg" weight="bold" tone={valueTone ?? 'primary'} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {sub ? <Text variant="caption" tone="tertiary" numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
}
