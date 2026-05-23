import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Text, Field, Button, Pressable, Divider } from '@/ui';
import { useTheme } from '@/theme';
import { walletApi } from '@/lib/api/wallet';
import { useAccountsStore } from '@/stores/accountsStore';
import { useAuthStore } from '@/stores/authStore';
import { ProfileHeader } from '../profile';

type Mode = 'main_to_trading' | 'trading_to_main' | 'internal';

const MODES: { value: Mode; label: string }[] = [
  { value: 'main_to_trading', label: 'Main → Trading' },
  { value: 'trading_to_main', label: 'Trading → Main' },
  { value: 'internal', label: 'Between accounts' },
];

export default function TransferScreen() {
  const theme = useTheme();
  const accounts = useAccountsStore((s) => s.accounts);
  const active = useAccountsStore((s) => s.active);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const reloadAccounts = useAccountsStore((s) => s.load);

  const [mode, setMode] = useState<Mode>('main_to_trading');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(active?.id ?? '');
  const [fromId, setFromId] = useState(active?.id ?? '');
  const [toId, setToId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async () => {
    setError(null);
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setError('Enter a positive amount.');
    setSubmitting(true);
    try {
      if (mode === 'main_to_trading') {
        if (!accountId) throw new Error('Pick a destination account.');
        await walletApi.mainToTrading({ amount: amt, account_id: accountId });
      } else if (mode === 'trading_to_main') {
        if (!accountId) throw new Error('Pick a source account.');
        await walletApi.tradingToMain({ amount: amt, account_id: accountId });
      } else {
        if (!fromId || !toId || fromId === toId) throw new Error('Pick two different accounts.');
        await walletApi.internal({ amount: amt, from_account_id: fromId, to_account_id: toId });
      }
      await Promise.all([refreshMe(), reloadAccounts()]);
      setDone(true);
      setTimeout(() => router.replace('/wallet'), 700);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transfer failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Transfer' }} />
      <ProfileHeader title="Transfer" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: theme.spacing[8] }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2], paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
            {MODES.map((m) => {
              const selected = mode === m.value;
              return (
                <Pressable
                  key={m.value}
                  onPress={() => setMode(m.value)}
                  haptic="light"
                  style={({ pressed }) => ({
                    paddingVertical: theme.spacing[1],
                    paddingHorizontal: theme.spacing[3],
                    borderRadius: theme.radius.full,
                    backgroundColor: selected ? theme.colors.buy : pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                    borderWidth: 1,
                    borderColor: selected ? theme.colors.buy : theme.colors.border.primary,
                  })}
                >
                  <Text variant="labelXs" tone={selected ? 'inverse' : 'secondary'} weight={selected ? 'bold' : 'medium'}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Divider />

          <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
            <Field label="Amount (USD)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!submitting} />

            {mode !== 'internal' ? (
              <AccountPicker
                label={mode === 'main_to_trading' ? 'Destination account' : 'Source account'}
                value={accountId}
                onChange={setAccountId}
                accounts={accounts}
              />
            ) : (
              <>
                <AccountPicker label="From" value={fromId} onChange={setFromId} accounts={accounts} />
                <AccountPicker label="To" value={toId} onChange={setToId} accounts={accounts.filter((a) => a.id !== fromId)} />
              </>
            )}

            {error ? <Text variant="body" tone="sell">{error}</Text> : null}
            {done ? <Text variant="body" tone="buy">Transferred.</Text> : null}
            <Button size="lg" onPress={onSubmit} loading={submitting}>Transfer</Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AccountPicker({
  label,
  value,
  onChange,
  accounts,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  accounts: { id: string; account_number: string; equity: number; currency: string; is_demo: boolean }[];
}) {
  const theme = useTheme();
  return (
    <View>
      <Text variant="label" tone="secondary">{label}</Text>
      <View style={{ height: theme.spacing[1] }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing[2] }}>
        {accounts.map((a) => {
          const selected = a.id === value;
          return (
            <Pressable
              key={a.id}
              onPress={() => onChange(a.id)}
              haptic="light"
              style={({ pressed }) => ({
                paddingVertical: theme.spacing[2],
                paddingHorizontal: theme.spacing[3],
                borderRadius: theme.radius.md,
                backgroundColor: selected ? theme.colors.buyBg : pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                borderWidth: 1,
                borderColor: selected ? theme.colors.buy : theme.colors.border.primary,
              })}
            >
              <Text variant="labelXs" tone="tertiary">
                {a.is_demo ? 'DEMO · ' : ''}#{a.account_number}
              </Text>
              <Text variant="bodyMd" weight={selected ? 'bold' : 'medium'}>
                {a.equity.toFixed(2)} {a.currency}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
