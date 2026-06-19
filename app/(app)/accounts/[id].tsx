import { useEffect, useState } from 'react';
import { View, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Text, Num, Money, Divider, Field, Button } from '@/ui';
import { useTheme } from '@/theme';
import { isCentAccount } from '@/lib/money';
import { accountsApi } from '@/lib/api/accounts';
import { useAccountsStore } from '@/stores/accountsStore';
import type { AccountSummary } from '@/types/accounts';
import { ProfileHeader } from '../profile';

export default function AccountDetailScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const id = String(params.id);
  const { accounts, patchAccount, removeAccount } = useAccountsStore();
  const account = accounts.find((a) => a.id === id);

  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [leverage, setLeverage] = useState(account ? String(account.leverage) : '');
  const [savingLev, setSavingLev] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account) return;
    setLeverage(String(account.leverage));
    accountsApi.summary(account.id).then(setSummary).catch(() => {});
  }, [account]);

  if (!account) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
        <Stack.Screen options={{ title: 'Account' }} />
        <ProfileHeader title="Account" />
        <View style={{ padding: theme.spacing[4] }}>
          <Text variant="bodyMd" tone="tertiary">Account not found. It may have been deleted.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onSaveLeverage = async () => {
    setError(null);
    const n = parseInt(leverage, 10);
    if (!Number.isFinite(n) || n < 1) return setError('Leverage must be a positive integer.');
    setSavingLev(true);
    try {
      await accountsApi.setLeverage(account.id, n);
      patchAccount(account.id, { leverage: n });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not update leverage.');
    } finally {
      setSavingLev(false);
    }
  };

  const onDelete = () => {
    if (account.is_demo) {
      return Alert.alert('Demo accounts cannot be deleted', 'Open a different one to switch.');
    }
    Alert.alert(
      'Delete account?',
      `Account #${account.account_number} will be closed. Withdraw any balance first — this cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await accountsApi.delete(account.id);
              removeAccount(account.id);
              router.back();
            } catch (e: unknown) {
              Alert.alert('Failed', e instanceof Error ? e.message : 'Could not delete account.');
            }
          },
        },
      ],
    );
  };

  const cent = isCentAccount(account);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: `#${account.account_number}` }} />
      <ProfileHeader title={`#${account.account_number}`} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[8] }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3], gap: theme.spacing[2] }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[2] }}>
              <Money value={account.equity} isCent={cent} variant="numXxl" />
              <Text variant="bodyMd" tone="tertiary">{cent ? 'Cent' : account.currency}</Text>
            </View>
            <Text variant="body" tone="tertiary">
              {account.is_demo ? 'Demo' : 'Live'} · {account.account_group?.name ?? 'Standard'} · 1:{account.leverage}
            </Text>
          </View>
          <Divider />

          <SummaryRow label="Balance" value={summary?.balance ?? account.balance} digits={2} money isCent={cent} />
          <SummaryRow label="Credit" value={summary?.credit ?? account.credit} digits={2} money isCent={cent} />
          <SummaryRow label="Margin used" value={summary?.margin_used ?? account.margin_used} digits={2} money isCent={cent} />
          <SummaryRow label="Free margin" value={summary?.free_margin ?? account.free_margin} digits={2} money isCent={cent} />
          <SummaryRow label="Margin level" value={summary?.margin_level ?? account.margin_level} digits={2} suffix="%" />
          {summary ? <SummaryRow label="Unrealized P&L" value={summary.unrealized_pnl} digits={2} pnl money isCent={cent} /> : null}
          {summary ? <SummaryRow label="Open positions" value={summary.open_positions_count} digits={0} /> : null}

          <View style={{ height: theme.spacing[6] }} />
          <Divider />
          <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
            <Text variant="label" tone="secondary">LEVERAGE</Text>
            <Field
              hint={`Hard ceiling 1:${account.account_group?.effective_max_leverage ?? account.account_group?.max_leverage ?? 2000}`}
              value={leverage}
              onChangeText={setLeverage}
              keyboardType="number-pad"
              maxLength={4}
              editable={!savingLev}
            />
            {error ? <Text variant="body" tone="sell">{error}</Text> : null}
            <Button onPress={onSaveLeverage} loading={savingLev} variant="secondary">Update leverage</Button>
          </View>

          <View style={{ height: theme.spacing[6] }} />
          <Divider />
          <View style={{ padding: theme.spacing[4] }}>
            <Button variant="danger" onPress={onDelete} disabled={account.is_demo}>Delete account</Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({
  label,
  value,
  digits,
  pnl,
  suffix,
  money,
  isCent,
}: {
  label: string;
  value: number;
  digits: number;
  pnl?: boolean;
  suffix?: string;
  /** Money row → cent-aware (¢/$); otherwise plain number (%, count). */
  money?: boolean;
  isCent?: boolean;
}) {
  const theme = useTheme();
  return (
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
        <Text variant="body" tone="secondary">{label}</Text>
        {money ? (
          <Money value={value} isCent={isCent} pnl={pnl} variant="num" />
        ) : (
          <Num value={value} digits={digits} pnl={pnl} suffix={suffix} variant="num" />
        )}
      </View>
      <Divider inset={theme.spacing[4]} />
    </>
  );
}
