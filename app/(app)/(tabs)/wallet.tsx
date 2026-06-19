import { useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronDown, Eye, Search, MessageCircle, Clock,
  ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, History,
  ShieldCheck, Lock, BadgeCheck,
} from 'lucide-react-native';
import { Text, Num, Pressable, Button, Divider, SkeletonRow, GradientBackground } from '@/ui';
import { useTheme } from '@/theme';
import { walletApi } from '@/lib/api/wallet';
import { QuickActionGrid } from '@/shared/components/QuickActionGrid';
import type { WalletTransaction } from '@/types/wallet';

/** Live wallet summary derived from GET /wallet/summary (mirrors the web
 *  trader's wallet page) plus a pending-withdrawals count from
 *  GET /wallet/withdrawals. */
interface WalletState {
  mainBalance: number;
  bonus: number;
  totalDeposited: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
}

const EMPTY_WALLET: WalletState = {
  mainBalance: 0,
  bonus: 0,
  totalDeposited: 0,
  totalWithdrawn: 0,
  pendingWithdrawals: 0,
};

/** Vantage-style Wallet — hero balance + 4-up actions + recent ledger.
 *  Empty state shows the broker-trust illustration card + open-account CTA. */
export default function WalletTab() {
  const theme = useTheme();
  const [txs, setTxs] = useState<WalletTransaction[] | null>(null);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  const load = async () => {
    // Fetch summary, withdrawals (pending count) and the recent ledger together.
    // Each is best-effort — a failure in one shouldn't blank the others.
    const [summaryRes, wdRes, txRes] = await Promise.allSettled([
      walletApi.summary(),
      walletApi.listWithdrawals(),
      walletApi.transactions({ page: 1, per_page: 8 }),
    ]);

    if (summaryRes.status === 'fulfilled') {
      const s = summaryRes.value;
      // Pending withdrawals — count rows whose status is "pending".
      // Shape is best-effort: the endpoint may return an array or a paged
      // { items } envelope, so handle both and skip silently otherwise.
      let pending = 0;
      if (wdRes.status === 'fulfilled') {
        const raw = wdRes.value as unknown;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as { items?: unknown }).items)
            ? (raw as { items: unknown[] }).items
            : [];
        pending = list.filter(
          (w) => String((w as { status?: string }).status ?? '').toLowerCase() === 'pending',
        ).length;
      }
      setWallet({
        mainBalance: Number(s.main_wallet_balance) || 0,
        bonus: Number(s.main_wallet_bonus) || 0,
        totalDeposited: Number(s.total_deposited) || 0,
        totalWithdrawn: Number(s.total_withdrawn) || 0,
        pendingWithdrawals: pending,
      });
    } else {
      setWallet((prev) => prev ?? EMPTY_WALLET);
    }

    setTxs(txRes.status === 'fulfilled' ? txRes.value.items : []);
  };

  useEffect(() => { void load(); }, []);

  const balance = wallet?.mainBalance ?? 0;
  const bonus = wallet?.bonus ?? 0;
  const pending = wallet?.pendingWithdrawals ?? 0;
  const isEmpty = balance === 0 && bonus === 0 && (txs?.length ?? 0) === 0;

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: theme.spacing[4],
          paddingTop: theme.spacing[2], paddingBottom: theme.spacing[2],
        }}
      >
        <Text variant="h1">Wallet</Text>
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
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            tintColor={theme.colors.text.secondary}
          />
        }
      >
        {/* Main wallet balance hero */}
        <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[2], gap: theme.spacing[1] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
            <Text variant="bodyMd" tone="secondary">Main Wallet</Text>
            <Pressable
              haptic="light"
              onPress={() => setShowBalance((v) => !v)}
              style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
            >
              <Eye size={16} color={theme.colors.text.secondary} strokeWidth={1.75} />
            </Pressable>
            {pending > 0 ? (
              <View
                style={{
                  marginLeft: 'auto',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing['0.5'],
                  paddingHorizontal: theme.spacing[2],
                  paddingVertical: theme.spacing['0.5'],
                  borderRadius: theme.radius.full,
                  backgroundColor: theme.colors.bg.chip,
                }}
              >
                <Clock size={12} color={theme.colors.warning} strokeWidth={2} />
                <Text variant="labelXs" tone="warning">{pending} pending</Text>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[2] }}>
            {showBalance ? (
              <Num value={balance} digits={2} variant="numXxl" />
            ) : (
              <Text variant="numXxl">••••••</Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant="bodyMd" tone="secondary">USD</Text>
              <ChevronDown size={14} color={theme.colors.text.secondary} strokeWidth={2} />
            </View>
          </View>

          {/* Bonus credit — tradeable but not withdrawable (cleared on first
              approved withdrawal). Only shown when there's bonus on file. */}
          {bonus > 0 ? (
            <View
              style={{
                marginTop: theme.spacing[1],
                padding: theme.spacing[3],
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: theme.colors.border.accent,
                backgroundColor: theme.colors.buyBg,
                gap: theme.spacing['0.5'],
              }}
            >
              <Text variant="labelXs" tone="accent">Bonus credit</Text>
              <Num value={bonus} digits={2} suffix="USD" variant="numLg" tone="accent" />
              <Text variant="body" tone="tertiary">
                Tradeable, not withdrawable. Cleared on first withdrawal.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Total Deposited / Total Withdrawn */}
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing[3],
            paddingHorizontal: theme.spacing[4],
            paddingTop: theme.spacing[4],
          }}
        >
          <StatCard
            theme={theme}
            label="Total Deposited"
            value={wallet?.totalDeposited ?? 0}
            tone="buy"
          />
          <StatCard
            theme={theme}
            label="Total Withdrawn"
            value={wallet?.totalWithdrawn ?? 0}
            tone="secondary"
          />
        </View>

        {/* Quick actions */}
        <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[5] }}>
          <QuickActionGrid
            items={[
              { key: 'deposit', icon: <ArrowDownToLine size={22} color={theme.colors.buy} strokeWidth={1.75} />, label: 'Deposit', onPress: () => router.push('/wallet/deposit') },
              { key: 'withdraw', icon: <ArrowUpFromLine size={22} color={theme.colors.sell} strokeWidth={1.75} />, label: 'Withdraw', onPress: () => router.push('/wallet/withdraw') },
              { key: 'transfer', icon: <ArrowRightLeft size={22} color={theme.colors.text.primary} strokeWidth={1.75} />, label: 'Transfer', onPress: () => router.push('/wallet/transfer') },
              { key: 'history', icon: <History size={22} color={theme.colors.text.primary} strokeWidth={1.75} />, label: 'History', onPress: () => router.push('/wallet/transactions') },
            ]}
          />
        </View>

        {/* Empty state OR recent transactions */}
        {isEmpty ? (
          <View style={{ paddingHorizontal: theme.spacing[4], gap: theme.spacing[5] }}>
            <View
              style={{
                alignItems: 'center',
                paddingVertical: theme.spacing[8],
                gap: theme.spacing[4],
              }}
            >
              <View
                style={{
                  width: 96, height: 96,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.bg.secondary,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <ShieldCheck size={48} color={theme.colors.buy} strokeWidth={1.5} />
              </View>
              <Text variant="h1" align="center">Secure Funds.{`\n`}Instant Trading.</Text>
              <View style={{ gap: theme.spacing[3], width: '100%' }}>
                <FeatureRow theme={theme} icon={<BadgeCheck size={20} color={theme.colors.buy} />} text="Regulated multi-asset broker" />
                <FeatureRow theme={theme} icon={<Lock size={20} color={theme.colors.buy} />} text="HttpOnly + Bearer auth, end-to-end" />
                <FeatureRow theme={theme} icon={<ShieldCheck size={20} color={theme.colors.buy} />} text="Trade insurance + segregated funds" />
              </View>
            </View>
            <View
              style={{
                padding: theme.spacing[4],
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.bg.secondary,
                gap: theme.spacing[1],
              }}
            >
              <Text variant="bodyLg" weight="bold">Open account in 2 mins</Text>
              <Text variant="bodyMd" tone="secondary">Start trading securely with SwisDex.</Text>
            </View>
            <Button onPress={() => router.push('/accounts/open')} size="xl">Open Account</Button>
          </View>
        ) : (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: theme.spacing[4],
                paddingVertical: theme.spacing[2],
              }}
            >
              <Text variant="h2">Recent Transactions</Text>
              <Pressable haptic="light" onPress={() => router.push('/wallet/transactions')}>
                <Text variant="bodyMd" tone="accent">View all</Text>
              </Pressable>
            </View>
            <Divider />
            {txs === null ? (
              <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={5} /></View>
            ) : (
              txs.map((t) => (
                <View key={t.id}>
                  <View
                    style={{
                      paddingHorizontal: theme.spacing[4],
                      paddingVertical: theme.spacing[3],
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyLg" weight="medium">{t.type.replace('_', ' ')}</Text>
                      {t.description ? (
                        <Text variant="bodyMd" tone="secondary" numberOfLines={1}>{t.description}</Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Num value={t.amount} digits={2} pnl signed variant="numLg" />
                      <Text variant="labelXs" tone="tertiary">{t.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Divider inset={theme.spacing[4]} />
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
    </GradientBackground>
  );
}

function StatCard({
  theme,
  label,
  value,
  tone,
}: {
  theme: ReturnType<typeof useTheme>;
  label: string;
  value: number;
  tone: 'buy' | 'secondary';
}) {
  return (
    <View
      style={{
        flex: 1,
        padding: theme.spacing[3],
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.bg.secondary,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
        gap: theme.spacing['0.5'],
      }}
    >
      <Text variant="labelXs" tone="tertiary">{label}</Text>
      <Num value={value} digits={2} suffix="USD" variant="numLg" tone={tone} />
    </View>
  );
}

function FeatureRow({ theme, icon, text }: { theme: ReturnType<typeof useTheme>; icon: React.ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] }}>
      <View
        style={{
          width: 32, height: 32,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.bg.secondary,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Text variant="bodyMd">{text}</Text>
    </View>
  );
}
