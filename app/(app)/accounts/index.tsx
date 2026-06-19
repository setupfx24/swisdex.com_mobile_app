import { useCallback, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useFocusEffect } from 'expo-router';
import { Plus, Check } from 'lucide-react-native';
import { Text, Money, Divider, Pressable, Button, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { isCentAccount } from '@/lib/money';
import { useAccountsStore } from '@/stores/accountsStore';
import { ProfileHeader } from '../profile';
import type { TradingAccount } from '@/types/accounts';

export default function AccountsListScreen() {
  const theme = useTheme();
  const { accounts, active, loading, error, load, setActive } = useAccountsStore();
  const [refreshing, setRefreshing] = useState(false);

  // Always pull a fresh list when the screen comes into focus (e.g. right
  // after opening a new account) so it never shows a stale empty state.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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

type Tone = 'accent' | 'warning' | 'buy' | 'tertiary';
/** Account type from the account_number prefix — mirrors the web accounts page.
 *  PM=PAMM pool, MM=MAM pool, CT=MAM master, CF=MAM, IF=investor sub-account,
 *  PT/else=regular live. (IB is a user-level role, not an account type.) */
function accountType(num: string): { label: string; tone: Tone } {
  switch ((num || '').slice(0, 2).toUpperCase()) {
    case 'PM': return { label: 'PAMM POOL', tone: 'accent' };
    case 'MM': return { label: 'MAM POOL', tone: 'accent' };
    case 'CT': return { label: 'MAM MASTER', tone: 'warning' };
    case 'CF': return { label: 'MAM', tone: 'buy' };
    case 'IF': return { label: 'INVESTMENT', tone: 'buy' };
    default: return { label: 'LIVE', tone: 'tertiary' };
  }
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
  const type = accountType(account.account_number);
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], flexWrap: 'wrap' }}>
              <Text variant="bodyMd" weight="medium">#{account.account_number}</Text>
              {account.is_demo ? (
                <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: theme.colors.bg.tertiary }}>
                  <Text variant="labelXs" tone="tertiary">DEMO</Text>
                </View>
              ) : (
                <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: theme.colors.bg.chip }}>
                  <Text variant="labelXs" tone={type.tone} weight="bold">{type.label}</Text>
                </View>
              )}
              {account.account_group ? (
                <Text variant="labelXs" tone="tertiary">{account.account_group.name}</Text>
              ) : null}
            </View>
            <View style={{ height: 2 }} />
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[2] }}>
              <Money value={account.equity} isCent={isCentAccount(account)} variant="numLg" />
              <Text variant="body" tone="tertiary">{isCentAccount(account) ? 'Cent' : account.currency} · 1:{account.leverage}</Text>
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
