import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Text, Field, Button, Pressable, Divider } from '@/ui';
import { useTheme } from '@/theme';
import { walletApi } from '@/lib/api/wallet';
import { useAuthStore } from '@/stores/authStore';
import { usePlatformStatusStore } from '@/stores/platformStatusStore';
import type { WithdrawalMethod } from '@/types/wallet';
import { ProfileHeader } from '../profile';

const METHODS: { value: WithdrawalMethod; label: string }[] = [
  { value: 'crypto_oxapay', label: 'Crypto' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'upi', label: 'UPI' },
];

export default function WithdrawScreen() {
  const theme = useTheme();
  const status = usePlatformStatusStore((s) => s.status);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [method, setMethod] = useState<WithdrawalMethod>('crypto_oxapay');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status && !status.allow_withdrawals) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
        <Stack.Screen options={{ title: 'Withdraw' }} />
        <ProfileHeader title="Withdraw" />
        <View style={{ padding: theme.spacing[4] }}>
          <Text variant="bodyMd" tone="warning">Withdrawals are temporarily paused by the broker.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onSubmit = async () => {
    setError(null);
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setError('Enter a positive amount.');
    setSubmitting(true);
    try {
      const body: Parameters<typeof walletApi.createWithdrawal>[0] = { amount: amt, method };
      if (method === 'crypto_oxapay') body.crypto_address = address.trim();
      if (method === 'bank') body.bank_details = { account_number: bankAccount.trim(), ifsc: bankIfsc.trim() };
      if (method === 'upi') body.bank_details = { upi_id: bankAccount.trim() };
      const fn = method === 'bank' || method === 'upi' ? walletApi.createManualWithdrawal : walletApi.createWithdrawal;
      await fn(body);
      await refreshMe();
      setDone(true);
      setTimeout(() => router.replace('/wallet'), 1_000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Withdraw' }} />
      <ProfileHeader title="Withdraw" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: theme.spacing[8] }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2], paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
            {METHODS.map((m) => {
              const selected = method === m.value;
              return (
                <Pressable
                  key={m.value}
                  onPress={() => setMethod(m.value)}
                  haptic="light"
                  style={({ pressed }) => ({
                    paddingVertical: theme.spacing[1],
                    paddingHorizontal: theme.spacing[3],
                    borderRadius: theme.radius.full,
                    backgroundColor: selected ? theme.colors.sell : pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                    borderWidth: 1,
                    borderColor: selected ? theme.colors.sell : theme.colors.border.primary,
                  })}
                >
                  <Text variant="labelXs" tone={selected ? 'inverse' : 'secondary'} weight={selected ? 'bold' : 'medium'}>
                    {m.label.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Divider />

          <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
            <Field label="Amount (USD)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!submitting} />
            {method === 'crypto_oxapay' ? (
              <Field label="Wallet address" value={address} onChangeText={setAddress} autoCapitalize="characters" editable={!submitting} />
            ) : null}
            {method === 'bank' ? (
              <>
                <Field label="Account number" value={bankAccount} onChangeText={setBankAccount} editable={!submitting} />
                <Field label="IFSC / SWIFT" value={bankIfsc} onChangeText={setBankIfsc} autoCapitalize="characters" editable={!submitting} />
              </>
            ) : null}
            {method === 'upi' ? (
              <Field label="UPI ID" value={bankAccount} onChangeText={setBankAccount} editable={!submitting} />
            ) : null}

            {error ? <Text variant="body" tone="sell">{error}</Text> : null}
            {done ? <Text variant="body" tone="buy">Withdrawal submitted — pending review.</Text> : null}

            <Button variant="danger" size="xl" onPress={onSubmit} loading={submitting}>Request withdrawal</Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
