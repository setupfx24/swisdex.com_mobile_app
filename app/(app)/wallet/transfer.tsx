import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { ArrowDown } from 'lucide-react-native';
import { Text, Num, Field, Button, Pressable, Divider } from '@/ui';
import { useTheme } from '@/theme';
import { walletApi, type WalletLiveAccount } from '@/lib/api/wallet';
import { useAccountsStore } from '@/stores/accountsStore';
import { useAuthStore } from '@/stores/authStore';
import { ProfileHeader } from '../profile';

// Mirror the web trader's unified transfer (frontend/trader/src/app/accounts/page.tsx
// `submitUnifiedTransfer`). A single source/destination selector over
// { 'wallet' } + live trading accounts; the endpoint is derived from which
// side is the main wallet:
//   wallet → trading : POST /wallet/transfer-main-to-trading { to_account_id, amount }
//   trading → wallet : POST /wallet/transfer-trading-to-main { from_account_id, amount }
//   trading ↔ trading: POST /wallet/transfer-internal { from_account_id, to_account_id, amount }

const WALLET_ID = 'wallet';

const DEMO_MSG =
  'Demo accounts cannot transfer funds. Open a live account to move balance between accounts.';

// Managed sub-accounts (CF = MAM, IF = PAMM investor) are engine-driven and
// pool accounts (PM/CT = master pools, MM) hold investor funds — neither can
// be manually funded/drained by the user, so they're excluded from transfers
// (the backend also enforces this; the web hides the buttons too).
const isManaged = (num: string) => num.startsWith('CF') || num.startsWith('IF');
const isPool = (num: string) => num.startsWith('PM') || num.startsWith('CT') || num.startsWith('MM');
const isTransferable = (num: string) => !isManaged(num) && !isPool(num);

interface TransferOption {
  id: string;
  label: string;
  sublabel: string;
  balance: number;
  currency: string;
}

export default function TransferScreen() {
  const theme = useTheme();
  const isDemo = useAuthStore((s) => s.user?.is_demo ?? false);
  const reloadAccounts = useAccountsStore((s) => s.load);

  const [loading, setLoading] = useState(true);
  const [mainBalance, setMainBalance] = useState(0);
  const [liveAccounts, setLiveAccounts] = useState<WalletLiveAccount[]>([]);

  const [fromId, setFromId] = useState<string>(WALLET_ID);
  const [toId, setToId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const s = await walletApi.summary();
      setMainBalance(Number(s.main_wallet_balance) || 0);
      // Only transferable live accounts — managed (CF/IF) + pool (PM/CT/MM)
      // accounts are excluded (engine/investor-locked).
      const live = (s.live_accounts ?? []).filter((a) => isTransferable(a.account_number));
      setLiveAccounts(live);
      return live;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load wallet balances.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isDemo) {
      setLoading(false);
      return;
    }
    void fetchSummary();
  }, [isDemo, fetchSummary]);

  // Seed sensible defaults once balances arrive: two accounts → between them;
  // one account → wallet → that account.
  useEffect(() => {
    if (initialized || loading) return;
    const first = liveAccounts[0];
    const second = liveAccounts[1];
    if (first && second) {
      setFromId(first.id);
      setToId(second.id);
    } else if (first) {
      setFromId(WALLET_ID);
      setToId(first.id);
    } else {
      setFromId(WALLET_ID);
      setToId('');
    }
    setInitialized(true);
  }, [initialized, loading, liveAccounts]);

  const options = useMemo<TransferOption[]>(() => {
    const opts: TransferOption[] = [
      { id: WALLET_ID, label: 'Main Wallet', sublabel: 'Wallet', balance: mainBalance, currency: 'USD' },
    ];
    for (const a of liveAccounts) {
      opts.push({
        id: a.id,
        label: `#${a.account_number}`,
        sublabel: 'Live',
        balance: Math.max(0, Number(a.free_margin ?? a.balance ?? 0)),
        currency: a.currency ?? 'USD',
      });
    }
    return opts;
  }, [liveAccounts, mainBalance]);

  const fromOption = options.find((o) => o.id === fromId);
  const fromBalance = fromOption?.balance ?? 0;

  // A wallet→wallet pairing is impossible; if both ends land on wallet, push
  // the other end onto the first available account.
  const pickFrom = (id: string) => {
    setError(null);
    setSuccess(null);
    setFromId(id);
    if (id === WALLET_ID && toId === WALLET_ID) {
      setToId(liveAccounts[0]?.id ?? '');
    } else if (id === toId) {
      // collapsed onto the same node — bump destination to a different one
      const other = options.find((o) => o.id !== id);
      setToId(other?.id ?? '');
    }
  };

  const pickTo = (id: string) => {
    setError(null);
    setSuccess(null);
    setToId(id);
    if (id === WALLET_ID && fromId === WALLET_ID) {
      setFromId(liveAccounts[0]?.id ?? '');
    } else if (id === fromId) {
      const other = options.find((o) => o.id !== id);
      setFromId(other?.id ?? '');
    }
  };

  const onSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (isDemo) return setError(DEMO_MSG);

    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setError('Enter a positive amount.');
    if (!fromId || !toId) return setError('Pick a source and destination.');
    if (fromId === toId) return setError('Source and destination must differ.');
    if (fromId === WALLET_ID && toId === WALLET_ID) return setError('Cannot transfer wallet to wallet.');
    if (amt > fromBalance + 1e-9) return setError('Insufficient balance in the source.');

    setSubmitting(true);
    try {
      if (fromId === WALLET_ID) {
        await walletApi.mainToTrading({ to_account_id: toId, amount: amt });
      } else if (toId === WALLET_ID) {
        await walletApi.tradingToMain({ from_account_id: fromId, amount: amt });
      } else {
        await walletApi.internal({ from_account_id: fromId, to_account_id: toId, amount: amt });
      }
      setSuccess('Transfer complete.');
      setAmount('');
      // Re-fetch live balances + sync the global accounts store so balances
      // update everywhere (mirrors the web's fetchWalletSummary + fetchAccounts).
      await Promise.all([fetchSummary(), reloadAccounts()]);
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: theme.spacing[16] }}
          keyboardShouldPersistTaps="handled"
        >
          {isDemo ? (
            <View style={{ padding: theme.spacing[4] }}>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border.primary,
                  backgroundColor: theme.colors.bg.secondary,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing[3],
                  gap: theme.spacing[1],
                }}
              >
                <Text variant="bodyMd" weight="bold" tone="warning">Demo account</Text>
                <Text variant="body" tone="secondary">{DEMO_MSG}</Text>
              </View>
            </View>
          ) : loading ? (
            <View style={{ padding: theme.spacing[8], alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.colors.buy} />
            </View>
          ) : (
            <View style={{ padding: theme.spacing[4], gap: theme.spacing[4] }}>
              {/* FROM */}
              <Selector
                title="From"
                options={options}
                value={fromId}
                onChange={pickFrom}
                disabledId={toId === WALLET_ID ? WALLET_ID : undefined}
              />

              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: theme.radius.full,
                    backgroundColor: theme.colors.bg.secondary,
                    borderWidth: 1,
                    borderColor: theme.colors.border.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowDown size={18} color={theme.colors.text.secondary} strokeWidth={2} />
                </View>
              </View>

              {/* TO */}
              <Selector
                title="To"
                options={options}
                value={toId}
                onChange={pickTo}
                disabledId={fromId === WALLET_ID ? WALLET_ID : undefined}
              />

              <Divider />

              <Field
                label="Amount (USD)"
                hint={`Available: ${fromBalance.toFixed(2)} ${fromOption?.currency ?? 'USD'}`}
                value={amount}
                onChangeText={(t) => { setAmount(t); setError(null); setSuccess(null); }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                editable={!submitting}
              />

              {/* Quick "Max" fill from the source balance. */}
              <Pressable
                onPress={() => { setAmount(fromBalance > 0 ? String(fromBalance.toFixed(2)) : ''); setError(null); }}
                haptic="light"
                style={{ alignSelf: 'flex-start' }}
              >
                <Text variant="body" tone="accent" weight="semibold">Transfer max</Text>
              </Pressable>

              {error ? <Text variant="body" tone="sell">{error}</Text> : null}
              {success ? <Text variant="body" tone="buy">{success}</Text> : null}

              <Button
                variant="buy"
                size="xl"
                onPress={onSubmit}
                loading={submitting}
                disabled={!amount || !fromId || !toId}
              >
                {amount ? `Transfer — $${(parseFloat(amount) || 0).toLocaleString()}` : 'Transfer'}
              </Button>

              {liveAccounts.length === 0 ? (
                <Text variant="body" tone="tertiary" align="center">
                  No transferable live accounts yet. Open a live account to move funds.
                </Text>
              ) : null}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Selector({
  title,
  options,
  value,
  onChange,
  disabledId,
}: {
  title: string;
  options: TransferOption[];
  value: string;
  onChange: (id: string) => void;
  /** An option to render disabled (e.g. wallet on both ends). */
  disabledId?: string;
}) {
  const theme = useTheme();
  return (
    <View>
      <Text variant="label" tone="secondary">{title}</Text>
      <View style={{ height: theme.spacing[1] }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing[2] }}>
        {options.map((o) => {
          const selected = o.id === value;
          const disabled = disabledId === o.id && !selected;
          return (
            <Pressable
              key={o.id}
              onPress={() => { if (!disabled) onChange(o.id); }}
              haptic="light"
              disabled={disabled}
              style={({ pressed }) => ({
                minWidth: 120,
                paddingVertical: theme.spacing[2],
                paddingHorizontal: theme.spacing[3],
                borderRadius: theme.radius.md,
                opacity: disabled ? 0.4 : 1,
                backgroundColor: selected ? theme.colors.buyBg : pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                borderWidth: 1,
                borderColor: selected ? theme.colors.buy : theme.colors.border.primary,
              })}
            >
              <Text variant="labelXs" tone="tertiary">{o.sublabel}</Text>
              <Text variant="bodyMd" weight={selected ? 'bold' : 'medium'}>{o.label}</Text>
              <Num value={o.balance} digits={2} suffix={o.currency} variant="body" tone="secondary" />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
