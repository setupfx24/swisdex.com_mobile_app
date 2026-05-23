import { useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronDown, Eye, Search, MessageCircle,
  ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, History,
  ShieldCheck, Lock, BadgeCheck,
} from 'lucide-react-native';
import { Text, Num, Pressable, Button, Divider, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { walletApi } from '@/lib/api/wallet';
import { QuickActionGrid } from '@/shared/components/QuickActionGrid';
import type { WalletTransaction } from '@/types/wallet';

/** Vantage-style Wallet — hero balance + 4-up actions + recent ledger.
 *  Empty state shows the broker-trust illustration card + open-account CTA. */
export default function WalletTab() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const [txs, setTxs] = useState<WalletTransaction[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  const load = async () => {
    try {
      const r = await walletApi.transactions({ page: 1, per_page: 8 });
      setTxs(r.items);
    } catch {
      setTxs([]);
    }
  };

  useEffect(() => { void load(); }, []);

  const balance = user?.main_wallet_balance ?? 0;
  const isEmpty = balance === 0 && (txs?.length ?? 0) === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
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
        {/* Total Balance hero */}
        <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[2], gap: theme.spacing[1] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
            <Text variant="bodyMd" tone="secondary">Total Balance</Text>
            <Pressable
              haptic="light"
              onPress={() => setShowBalance((v) => !v)}
              style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
            >
              <Eye size={16} color={theme.colors.text.secondary} strokeWidth={1.75} />
            </Pressable>
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
          <Text variant="bodyMd" tone="secondary">Today's PnL 0.00 USD</Text>
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
