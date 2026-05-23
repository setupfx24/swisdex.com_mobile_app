import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, History } from 'lucide-react-native';
import { Text, Num, Divider, Pressable, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { walletApi } from '@/lib/api/wallet';
import type { WalletTransaction } from '@/types/wallet';

interface ActionTileProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

function ActionTile({ icon, label, onPress }: ActionTileProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      haptic="light"
      style={({ pressed }) => ({
        flex: 1,
        paddingVertical: theme.spacing[4],
        paddingHorizontal: theme.spacing[2],
        borderRadius: theme.radius.lg,
        backgroundColor: pressed ? theme.colors.bg.active : theme.colors.bg.secondary,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing[1],
      })}
    >
      {icon}
      <Text variant="labelXs" weight="medium">{label}</Text>
    </Pressable>
  );
}

export default function WalletTab() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const [txs, setTxs] = useState<WalletTransaction[] | null>(null);

  useEffect(() => {
    walletApi.transactions({ page: 1, per_page: 12 })
      .then((r) => setTxs(r.items))
      .catch(() => setTxs([]));
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[2] }}>
        <Text variant="h2">Wallet</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[12] }}>
        <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
          <Text variant="label" tone="tertiary">MAIN WALLET</Text>
          <Num value={user?.main_wallet_balance ?? 0} digits={2} variant="numXxl" />
          <Text variant="body" tone="tertiary">USD</Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing[2],
            paddingHorizontal: theme.spacing[4],
            paddingBottom: theme.spacing[3],
          }}
        >
          <ActionTile
            icon={<ArrowDownToLine size={22} color={theme.colors.buy} strokeWidth={1.75} />}
            label="Deposit"
            onPress={() => router.push('/wallet/deposit')}
          />
          <ActionTile
            icon={<ArrowUpFromLine size={22} color={theme.colors.sell} strokeWidth={1.75} />}
            label="Withdraw"
            onPress={() => router.push('/wallet/withdraw')}
          />
          <ActionTile
            icon={<ArrowRightLeft size={22} color={theme.colors.text.primary} strokeWidth={1.75} />}
            label="Transfer"
            onPress={() => router.push('/wallet/transfer')}
          />
        </View>

        <Divider />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: theme.spacing[4],
            paddingVertical: theme.spacing[2],
          }}
        >
          <Text variant="label" tone="tertiary">RECENT TRANSACTIONS</Text>
          <Pressable onPress={() => router.push('/wallet/transactions')} haptic="light">
            <Text variant="body" tone="accent">View all →</Text>
          </Pressable>
        </View>
        <Divider />

        {txs === null ? (
          <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={5} /></View>
        ) : txs.length === 0 ? (
          <View style={{ padding: theme.spacing[6] }}>
            <Text variant="bodyMd" tone="tertiary" align="center">No transactions yet.</Text>
          </View>
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
                <View>
                  <Text variant="bodyMd" weight="medium">
                    {t.type.replace('_', ' ')}
                  </Text>
                  {t.description ? (
                    <Text variant="labelXs" tone="tertiary" numberOfLines={1}>{t.description}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Num
                    value={t.amount}
                    digits={2}
                    pnl
                    signed
                    variant="num"
                  />
                  <Text variant="labelXs" tone="tertiary">{t.status.toUpperCase()}</Text>
                </View>
              </View>
              <Divider inset={theme.spacing[4]} />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
