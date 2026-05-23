import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import { Text, Num, Divider, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { fixedReturnApi, type FixedReturnConfig, type FixedReturnLock } from '@/lib/api/earn';
import { ProfileHeader } from '../profile';

export default function FixedReturnScreen() {
  const theme = useTheme();
  const [cfg, setCfg] = useState<FixedReturnConfig | null>(null);
  const [locks, setLocks] = useState<FixedReturnLock[] | null>(null);

  useEffect(() => {
    fixedReturnApi.config().then(setCfg).catch(() => setCfg(null));
    fixedReturnApi.locks().then(setLocks).catch(() => setLocks([]));
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Fixed return' }} />
      <ProfileHeader title="Fixed return" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[8] }}>
        <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2] }}>
          <Text variant="label" tone="tertiary">RATE LADDER</Text>
        </View>
        <Divider />
        {cfg === null ? (
          <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={4} /></View>
        ) : (
          cfg.tiers.map((t) => (
            <View key={t.tenure_label}>
              <View
                style={{
                  paddingHorizontal: theme.spacing[4],
                  paddingVertical: theme.spacing[3],
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text variant="bodyMd" weight="medium">{t.tenure_label}</Text>
                <Num value={t.rate_pct} digits={2} suffix="%" tone="buy" variant="numLg" />
              </View>
              <Divider inset={theme.spacing[4]} />
            </View>
          ))
        )}
        {cfg ? (
          <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
            <Text variant="body" tone="tertiary">
              Early withdrawal fee: {cfg.early_withdrawal_fee_pct.toFixed(1)}%
            </Text>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2] }}>
          <Text variant="label" tone="tertiary">MY LOCKS</Text>
        </View>
        <Divider />
        {locks === null ? (
          <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={2} /></View>
        ) : locks.length === 0 ? (
          <View style={{ padding: theme.spacing[6] }}>
            <Text variant="bodyMd" tone="tertiary" align="center">No active locks.</Text>
          </View>
        ) : (
          locks.map((l) => (
            <View key={l.id}>
              <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="bodyMd" weight="medium">${l.principal.toFixed(2)} · {l.tenure_label}</Text>
                  <Text variant="labelXs" tone={l.status === 'active' ? 'accent' : 'tertiary'}>{l.status.toUpperCase()}</Text>
                </View>
                <Text variant="body" tone="tertiary">
                  +${l.accrued_interest.toFixed(2)} accrued · matures {format(new Date(l.matures_at), 'MMM d, yyyy')}
                </Text>
              </View>
              <Divider inset={theme.spacing[4]} />
            </View>
          ))
        )}

        <View style={{ padding: theme.spacing[4] }}>
          <Text variant="body" tone="tertiary" align="center">
            New-lock + withdraw flows ship in a follow-up.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
