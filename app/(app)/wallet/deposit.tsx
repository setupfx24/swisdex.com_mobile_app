import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Text, Field, Button, Pressable, Divider } from '@/ui';
import { useTheme } from '@/theme';
import { walletApi } from '@/lib/api/wallet';
import { usePlatformStatusStore } from '@/stores/platformStatusStore';
import type { DepositMethod } from '@/types/wallet';
import { ProfileHeader } from '../profile';

const METHODS: { value: DepositMethod; label: string; hint: string }[] = [
  { value: 'crypto_nowpayments', label: 'Crypto (NOWPayments)', hint: 'USDT / BTC / ETH — hosted invoice' },
  { value: 'crypto_oxapay',      label: 'Crypto (OxaPay)',      hint: 'Legacy crypto rail' },
  { value: 'bank',               label: 'Bank transfer',         hint: 'Wire to broker, upload proof' },
  { value: 'upi',                label: 'UPI',                   hint: 'India — instant UPI handle' },
];

export default function DepositScreen() {
  const theme = useTheme();
  const status = usePlatformStatusStore((s) => s.status);
  const [method, setMethod] = useState<DepositMethod>('crypto_nowpayments');
  const [amount, setAmount] = useState('');
  const [crypto, setCrypto] = useState('USDT_ERC');
  const [txnId, setTxnId] = useState('');
  const [promo, setPromo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status && !status.allow_deposits) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
        <Stack.Screen options={{ title: 'Deposit' }} />
        <ProfileHeader title="Deposit" />
        <View style={{ padding: theme.spacing[4] }}>
          <Text variant="bodyMd" tone="warning">Deposits are temporarily paused by the broker.</Text>
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
      const body = {
        amount: amt,
        method,
        ...(method.startsWith('crypto_') ? { crypto_currency: crypto.trim().toUpperCase() } : {}),
        ...(method === 'bank' ? { transaction_id: txnId.trim() || undefined } : {}),
        ...(promo.trim() ? { promo_code: promo.trim() } : {}),
      };
      const deposit = method === 'bank' || method === 'upi'
        ? await walletApi.createManualDeposit(body)
        : await walletApi.createDeposit(body);

      // For hosted-invoice crypto: backend returns invoice_url (NOWPayments)
      // or pay_address (wallet-connect mode). Open the invoice in the
      // in-app browser per CLAUDE.md decision (in-app wins over external).
      if (deposit.invoice_url) {
        await WebBrowser.openBrowserAsync(deposit.invoice_url);
      }
      router.replace('/wallet');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Deposit failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Deposit' }} />
      <ProfileHeader title="Deposit" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: theme.spacing[8] }}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="label" tone="secondary" style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2] }}>
            METHOD
          </Text>
          <Divider />
          {METHODS.map((m) => {
            const selected = method === m.value;
            return (
              <View key={m.value}>
                <Pressable
                  onPress={() => setMethod(m.value)}
                  haptic="light"
                  style={({ pressed }) => ({
                    paddingHorizontal: theme.spacing[4],
                    paddingVertical: theme.spacing[3],
                    backgroundColor: selected ? theme.colors.buyBg : pressed ? theme.colors.bg.hover : 'transparent',
                    borderLeftWidth: selected ? 3 : 0,
                    borderLeftColor: theme.colors.buy,
                  })}
                >
                  <Text variant="bodyMd" weight={selected ? 'bold' : 'medium'}>{m.label}</Text>
                  <Text variant="body" tone="tertiary">{m.hint}</Text>
                </Pressable>
                <Divider />
              </View>
            );
          })}

          <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
            <Field label="Amount (USD)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!submitting} />
            {method.startsWith('crypto_') ? (
              <Field label="Crypto" hint="USDT_ERC / BTC / ETH / TRC20 etc." value={crypto} onChangeText={setCrypto} autoCapitalize="characters" editable={!submitting} />
            ) : null}
            {method === 'bank' ? (
              <Field label="Bank reference" hint="Optional — speeds up review." value={txnId} onChangeText={setTxnId} editable={!submitting} />
            ) : null}
            <Field label="Promo code" hint="Optional bonus / referral code." value={promo} onChangeText={setPromo} autoCapitalize="characters" editable={!submitting} />

            {error ? <Text variant="body" tone="sell">{error}</Text> : null}
            <Button variant="buy" size="xl" onPress={onSubmit} loading={submitting}>Continue</Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
