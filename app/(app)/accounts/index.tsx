import { useCallback, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Plus, Check } from 'lucide-react-native';
import { Text, Num, Divider, Pressable, Button, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { useAccountsStore } from '@/stores/accountsStore';
import { ProfileHeader } from '../profile';
import type { TradingAccount } from '@/types/accounts';

export default function AccountsListScreen() {
  const theme = useTheme();
  const { accounts, active, loading, error, load, setActive } = useAccountsStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Trading accounts' }} />
      <ProfileHeader title="Trading accounts" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing[12] }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text.secondary} />
        }
      >
        {loading && accounts.length === 0 ? (
          <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={3} /></View>
        ) : accounts.length === 0 ? (
          <View style={{ padding: theme.spacing[6], gap: theme.spacing[3] }}>
            <Text variant="bodyMd" tone="tertiary" align="center">No accounts yet.</Text>
            <Button onPress={() => router.push('/accounts/open')}>Open your first account</Button>
          </View>
        ) : (
          <>
            <Divider />
            {accounts.map((a) => (
              <AccountRow
                key={a.id}
                account={a}
                selected={active?.id === a.id}
                onSelect={() => setActive(a)}
                onOpen={() => router.push({ pathname: '/accounts/[id]', params: { id: a.id } })}
              />
            ))}
            <View style={{ padding: theme.spacing[4] }}>
              <Button
                variant="secondary"
                onPress={() => router.push('/accounts/open')}
                style={{ flexDirection: 'row', gap: 8 }}
              >
                + Open new account
              </Button>
            </View>
            {error ? (
              <View style={{ paddingHorizontal: theme.spacing[4] }}>
                <Text variant="body" tone="sell">{error}</Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AccountRow({
  account,
  selected,
  onSelect,
  onOpen,
}: {
  account: TradingAccount;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  const theme = useTheme();
  return (
    <>
      <Pressable
        onPress={onOpen}
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
              <Text variant="bodyMd" weight="medium">#{account.account_number}</Text>
              {account.is_demo ? (
                <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: theme.colors.bg.tertiary }}>
                  <Text variant="labelXs" tone="tertiary">DEMO</Text>
                </View>
              ) : null}
              {account.account_group ? (
                <Text variant="labelXs" tone="tertiary">{account.account_group.name}</Text>
              ) : null}
            </View>
            <View style={{ height: 2 }} />
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[2] }}>
              <Num value={account.equity} digits={2} variant="numLg" />
              <Text variant="body" tone="tertiary">{account.currency} · 1:{account.leverage}</Text>
            </View>
          </View>

          <Pressable
            onPress={onSelect}
            haptic="medium"
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: theme.radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected
                ? theme.colors.buy
                : pressed
                  ? theme.colors.bg.active
                  : theme.colors.bg.secondary,
              borderWidth: 1,
              borderColor: selected ? theme.colors.buy : theme.colors.border.primary,
            })}
          >
            {selected ? <Check size={18} color="#FFFFFF" strokeWidth={3} /> : null}
          </Pressable>
        </View>
      </Pressable>
      <Divider />
    </>
  );
}
