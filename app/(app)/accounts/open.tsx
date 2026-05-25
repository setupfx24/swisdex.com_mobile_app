import { useEffect, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Text, Field, Button, Divider, Pressable, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { accountsApi } from '@/lib/api/accounts';
import { useAccountsStore } from '@/stores/accountsStore';
import type { AvailableAccountGroup } from '@/types/accounts';
import { ProfileHeader } from '../profile';

export default function OpenAccountScreen() {
  const theme = useTheme();
  const load = useAccountsStore((s) => s.load);
  const setActive = useAccountsStore((s) => s.setActive);

  const [groups, setGroups] = useState<AvailableAccountGroup[] | null>(null);
  const [picked, setPicked] = useState<AvailableAccountGroup | null>(null);
  const [leverage, setLeverage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await accountsApi.availableGroups();
        // Backend may return [..] OR {items:[..]} OR null — normalise.
        const g = Array.isArray(res)
          ? res
          : Array.isArray((res as { items?: typeof res })?.items)
            ? (res as { items: typeof res }).items
            : [];
        setGroups(g);
        const def = g.find((x) => !x.is_demo) ?? g[0] ?? null;
        if (def) {
          setPicked(def);
          setLeverage(String(def.leverage_default));
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Could not load account types.');
      }
    })();
  }, []);

  const onPick = (g: AvailableAccountGroup) => {
    setPicked(g);
    setLeverage(String(g.leverage_default));
  };

  const onOpen = async () => {
    if (!picked) return;
    setError(null);
    const lev = parseInt(leverage, 10);
    if (!Number.isFinite(lev) || lev < 1 || lev > picked.max_leverage) {
      return setError(`Leverage must be between 1 and ${picked.max_leverage}.`);
    }
    setSubmitting(true);
    try {
      const created = await accountsApi.open({
        account_group_id: picked.id,
        leverage: lev,
        is_demo: picked.is_demo,
      });
      await load();
      await setActive(created);
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not open account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Open account' }} />
      <ProfileHeader title="Open new account" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: theme.spacing[8] }}
          keyboardShouldPersistTaps="handled"
        >
          {groups === null ? (
            <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={3} /></View>
          ) : (
            <>
              <Text variant="label" tone="secondary" style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2] }}>
                ACCOUNT TYPE
              </Text>
              <Divider />
              {groups.filter((g) => g.is_active).map((g) => {
                const selected = picked?.id === g.id;
                return (
                  <View key={g.id}>
                    <Pressable
                      onPress={() => onPick(g)}
                      haptic="light"
                      style={({ pressed }) => ({
                        paddingHorizontal: theme.spacing[4],
                        paddingVertical: theme.spacing[3],
                        backgroundColor: selected ? theme.colors.buyBg : pressed ? theme.colors.bg.hover : 'transparent',
                        borderLeftWidth: selected ? 3 : 0,
                        borderLeftColor: theme.colors.buy,
                      })}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
                        <Text variant="bodyMd" weight={selected ? 'bold' : 'medium'}>{g.name}</Text>
                        {g.is_demo ? (
                          <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: theme.colors.bg.tertiary }}>
                            <Text variant="labelXs" tone="tertiary">DEMO</Text>
                          </View>
                        ) : null}
                        {g.swap_free ? (
                          <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: theme.colors.bg.tertiary }}>
                            <Text variant="labelXs" tone="tertiary">SWAP-FREE</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={{ height: 2 }} />
                      <Text variant="body" tone="tertiary">
                        Max 1:{g.max_leverage} · min ${g.minimum_deposit.toFixed(0)} · spread {(g.spread_markup_default * 10000).toFixed(1)} pips
                      </Text>
                    </Pressable>
                    <Divider />
                  </View>
                );
              })}

              {picked ? (
                <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
                  <Field
                    label={`Leverage (1 – ${picked.max_leverage})`}
                    value={leverage}
                    onChangeText={setLeverage}
                    keyboardType="number-pad"
                    maxLength={4}
                    editable={!submitting}
                  />
                  {error ? <Text variant="body" tone="sell">{error}</Text> : null}
                  <Button onPress={onOpen} loading={submitting} size="lg">
                    Open {picked.is_demo ? 'demo' : 'live'} account
                  </Button>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
