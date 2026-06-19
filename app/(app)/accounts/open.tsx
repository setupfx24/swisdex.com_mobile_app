import { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Text, Button, Pressable, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { accountsApi } from '@/lib/api/accounts';
import { useAccountsStore } from '@/stores/accountsStore';
import { useAuthStore } from '@/stores/authStore';
import type { AvailableAccountGroup } from '@/types/accounts';
import { ProfileHeader } from '../profile';

const LEVERAGE_OPTIONS = [1, 25, 50, 100, 200, 300, 500, 1000, 2000];

const fmtMoney = (n: number) => `$${Math.round(n || 0).toLocaleString('en-US')}`;

function groupMax(g: AvailableAccountGroup): number {
  return Number(g.effective_max_leverage ?? g.max_leverage ?? g.leverage_default ?? 100);
}

/** Open-account flow — mirrors the web AccountTypePickerModal: Real/Demo
 *  toggle, KYC gate for live, platform (account-group) cards, leverage
 *  picker clamped to the group's cap. */
export default function OpenAccountScreen() {
  const theme = useTheme();
  const load = useAccountsStore((s) => s.load);
  const setActive = useAccountsStore((s) => s.setActive);
  const user = useAuthStore((s) => s.user);

  const userIsDemo = !!user?.is_demo;
  const kycApproved = ['approved', 'verified'].includes((user?.kyc_status || '').toLowerCase());

  const [accountKind, setAccountKind] = useState<'real' | 'demo'>(userIsDemo ? 'demo' : 'real');
  const [groups, setGroups] = useState<AvailableAccountGroup[] | null>(null);
  const [picked, setPicked] = useState<AvailableAccountGroup | null>(null);
  const [leverage, setLeverage] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refetch the group pool whenever the Real/Demo toggle flips — the backend
  // returns a different set for ?is_demo=true.
  useEffect(() => {
    let cancelled = false;
    setGroups(null);
    setPicked(null);
    setLeverage(null);
    setError(null);
    (async () => {
      try {
        const res = await accountsApi.availableGroups(accountKind === 'demo');
        if (cancelled) return;
        const list = Array.isArray(res)
          ? res
          : Array.isArray((res as { items?: AvailableAccountGroup[] })?.items)
            ? (res as { items: AvailableAccountGroup[] }).items
            : [];
        setGroups(list);
        const first = list[0];
        if (first) {
          setPicked(first);
          setLeverage(groupMax(first));
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load account types.');
        if (!cancelled) setGroups([]);
      }
    })();
    return () => { cancelled = true; };
  }, [accountKind]);

  const onPick = (g: AvailableAccountGroup) => {
    setPicked(g);
    const max = groupMax(g);
    setLeverage((cur) => (cur == null || cur > max ? max : cur));
  };

  const leverageOptions = useMemo(() => {
    if (!picked) return [] as number[];
    const max = groupMax(picked);
    const opts = LEVERAGE_OPTIONS.filter((l) => l <= max);
    if (!opts.includes(max)) opts.push(max);
    return Array.from(new Set(opts)).sort((a, b) => a - b);
  }, [picked]);

  const blockedByKyc = accountKind === 'real' && !userIsDemo && !kycApproved;

  const onCreate = async () => {
    if (!picked) return;
    setError(null);
    setSubmitting(true);
    try {
      const created = await accountsApi.open({
        account_group_id: picked.id,
        leverage: leverage ?? picked.leverage_default,
        is_demo: accountKind === 'demo',
      });
      // Refresh the list, then make the brand-new account active (use the
      // full row from the reloaded store, since /accounts/open returns a
      // partial {id, account_number}).
      await load();
      const full = useAccountsStore.getState().accounts.find((a) => a.id === created.id);
      if (full) await setActive(full);
      Alert.alert(
        'Account created',
        accountKind === 'demo'
          ? 'Your demo account was created successfully with $10,000 virtual funds.'
          : 'Your trading account was created successfully.',
        [{ text: 'OK', onPress: () => router.replace('/accounts') }],
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      setError(
        msg === 'KYC_REQUIRED'
          ? 'Please complete KYC verification before opening a live account.'
          : msg || 'Could not open account.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const Pill = ({ kind, label, disabled }: { kind: 'real' | 'demo'; label: string; disabled?: boolean }) => {
    const active = accountKind === kind;
    return (
      <Pressable
        haptic="light"
        disabled={disabled}
        onPress={() => !disabled && setAccountKind(kind)}
        style={{
          paddingHorizontal: theme.spacing[5],
          paddingVertical: theme.spacing[2],
          borderRadius: theme.radius.md,
          backgroundColor: active ? theme.colors.buy : 'transparent',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text variant="bodyMd" weight="bold" style={{ color: active ? '#FFFFFF' : theme.colors.text.secondary }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Set up account' }} />
      <ProfileHeader title="Set up account details" />
      <ScrollView contentContainerStyle={{ padding: theme.spacing[4], paddingBottom: theme.spacing[10], gap: theme.spacing[5] }}>
        {/* Account type */}
        <View>
          <Text variant="bodyMd" weight="bold" style={{ marginBottom: theme.spacing[2] }}>Account type</Text>
          <View
            style={{
              flexDirection: 'row',
              alignSelf: 'flex-start',
              padding: theme.spacing[1],
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.bg.secondary,
              borderWidth: 1,
              borderColor: theme.colors.border.primary,
            }}
          >
            <Pill kind="real" label="Real" disabled={userIsDemo} />
            <Pill kind="demo" label="Demo" />
          </View>

          {userIsDemo ? (
            <Text variant="body" tone="tertiary" style={{ marginTop: theme.spacing[2] }}>
              Demo users can only open demo accounts.
            </Text>
          ) : accountKind === 'demo' ? (
            <Text variant="body" tone="tertiary" style={{ marginTop: theme.spacing[2] }}>
              Demo accounts start with $10,000 virtual funds — same execution as live, no deposit or KYC needed.
            </Text>
          ) : !kycApproved ? (
            <View
              style={{
                marginTop: theme.spacing[3],
                padding: theme.spacing[3],
                borderRadius: theme.radius.md,
                backgroundColor: 'rgba(245,158,11,0.10)',
                borderWidth: 1,
                borderColor: 'rgba(245,158,11,0.4)',
              }}
            >
              <Text variant="body" style={{ color: '#F59E0B' }}>
                Live accounts require KYC verification. Switch to Demo above to practise right away, or{' '}
                <Text variant="body" weight="bold" style={{ color: '#F59E0B', textDecorationLine: 'underline' }} onPress={() => router.push('/kyc')}>
                  complete your KYC
                </Text>{' '}to open a live account.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Platform / account-group cards */}
        <View>
          <Text variant="bodyMd" weight="bold" style={{ marginBottom: theme.spacing[2] }}>Platform</Text>
          {groups === null ? (
            <SkeletonRow count={3} />
          ) : groups.length === 0 ? (
            <View style={{ padding: theme.spacing[5], borderRadius: theme.radius.lg, backgroundColor: theme.colors.bg.secondary }}>
              <Text variant="bodyMd" tone="secondary" align="center">No account types available. Contact support.</Text>
            </View>
          ) : (
            <View style={{ gap: theme.spacing[3] }}>
              {groups.map((g, i) => {
                const sel = picked?.id === g.id;
                const max = groupMax(g);
                const minSub = g.swap_free
                  ? 'Swap-free, Islamic-friendly'
                  : g.commission_pct != null
                    ? `Brokerage ${(g.commission_pct * 100).toFixed(2)}% · Up to 1:${max}`
                    : `Commission ${fmtMoney(g.commission_per_lot)} / lot · Up to 1:${max}`;
                return (
                  <Pressable
                    key={g.id}
                    haptic="light"
                    onPress={() => onPick(g)}
                    style={{
                      borderRadius: theme.radius.lg,
                      padding: theme.spacing[4],
                      backgroundColor: theme.colors.bg.secondary,
                      borderWidth: sel ? 2 : 1,
                      borderColor: sel ? theme.colors.buy : theme.colors.border.primary,
                    }}
                  >
                    <View
                      style={{
                        width: 34, height: 34, borderRadius: 17, marginBottom: theme.spacing[2],
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: 'rgba(85,166,48,0.12)',
                        borderWidth: 1, borderColor: 'rgba(85,166,48,0.3)',
                      }}
                    >
                      <Text variant="bodyMd" weight="bold" style={{ color: theme.colors.buy }}>{i + 1}</Text>
                    </View>
                    <CardRow theme={theme} label={`Spread from ${(g.spread_markup || 0.6).toFixed(1)} pips`} sub="Floating spread, markup" />
                    <CardRow theme={theme} label={g.name || 'Standard account'} sub={g.description || 'Currencies, indices, metals, energies, crypto'} />
                    <CardRow theme={theme} label={`Min deposit ${fmtMoney(g.minimum_deposit)}`} sub={minSub} last />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Leverage */}
        {picked ? (
          <View>
            <Text variant="bodyMd" weight="bold" style={{ marginBottom: theme.spacing[2] }}>Leverage</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] }}>
              {leverageOptions.map((l) => {
                const sel = leverage === l;
                return (
                  <Pressable
                    key={l}
                    haptic="light"
                    onPress={() => setLeverage(l)}
                    style={{
                      paddingHorizontal: theme.spacing[4],
                      paddingVertical: theme.spacing[2],
                      borderRadius: theme.radius.md,
                      backgroundColor: sel ? theme.colors.buyBg : theme.colors.bg.secondary,
                      borderWidth: 1,
                      borderColor: sel ? theme.colors.buy : theme.colors.border.primary,
                    }}
                  >
                    <Text variant="bodyMd" weight={sel ? 'bold' : 'regular'} style={sel ? { color: theme.colors.buy } : undefined}>
                      1:{l}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text variant="body" tone="tertiary" style={{ marginTop: theme.spacing[2] }}>
              Capped at this account type&apos;s maximum: 1:{groupMax(picked)}
            </Text>
            {picked.kyc_unlock_required || picked.xp_unlock_required ? (
              <Text variant="body" style={{ marginTop: 2, color: '#F59E0B' }}>
                {picked.kyc_unlock_required ? 'Complete KYC to unlock higher leverage. ' : ''}
                {picked.xp_unlock_required && picked.xp_for_next_unlock && picked.next_unlock_leverage
                  ? `Reach ${picked.xp_for_next_unlock} XP to unlock 1:${picked.next_unlock_leverage}.`
                  : ''}
              </Text>
            ) : null}
          </View>
        ) : null}

        {error ? <Text variant="body" tone="sell">{error}</Text> : null}

        <Button
          onPress={onCreate}
          loading={submitting}
          disabled={!picked || blockedByKyc}
          size="lg"
        >
          {accountKind === 'demo' ? 'Create demo account' : 'Create account'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

function CardRow({
  theme, label, sub, last,
}: {
  theme: ReturnType<typeof useTheme>;
  label: string;
  sub: string;
  last?: boolean;
}) {
  return (
    <View style={{ paddingVertical: theme.spacing[2], borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.colors.border.primary }}>
      <Text variant="bodyMd" weight="semibold">{label}</Text>
      <Text variant="body" tone="tertiary" style={{ marginTop: 1 }}>{sub}</Text>
    </View>
  );
}
