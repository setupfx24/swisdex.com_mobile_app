import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import { Text, Num, Divider, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { stakingApi, type StakingPlan, type StakingPosition } from '@/lib/api/earn';
import { ProfileHeader } from '../profile';

export default function StakingScreen() {
  const theme = useTheme();
  const [plans, setPlans] = useState<StakingPlan[] | null>(null);
  const [positions, setPositions] = useState<StakingPosition[] | null>(null);

  useEffect(() => {
    stakingApi.plans().then(setPlans).catch(() => setPlans([]));
    stakingApi.positions().then(setPositions).catch(() => setPositions([]));
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Staking' }} />
      <ProfileHeader title="Staking" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[8] }}>
        <Section label="AVAILABLE PLANS" theme={theme}>
          {plans === null ? <SkeletonRow count={3} /> : plans.length === 0 ? (
            <Text variant="bodyMd" tone="tertiary" align="center">No plans available.</Text>
          ) : (
            plans.filter((p) => p.is_active).map((p) => (
              <View key={p.id}>
                <View style={{ paddingVertical: theme.spacing[3] }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="bodyMd" weight="medium">{p.label}</Text>
                    <Num value={p.apy_pct} digits={2} suffix="% APY" variant="numLg" tone="buy" />
                  </View>
                  <Text variant="body" tone="tertiary">
                    {p.tenure_days}-day lock · min ${p.min_amount}{p.max_amount ? ` / max $${p.max_amount}` : ''}
                  </Text>
                </View>
                <Divider />
              </View>
            ))
          )}
        </Section>

        <Section label="MY POSITIONS" theme={theme}>
          {positions === null ? <SkeletonRow count={2} /> : positions.length === 0 ? (
            <Text variant="bodyMd" tone="tertiary" align="center">You have no active stakes.</Text>
          ) : (
            positions.map((p) => (
              <View key={p.id}>
                <View style={{ paddingVertical: theme.spacing[3] }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="bodyMd" weight="medium">${p.principal.toFixed(2)} principal</Text>
                    <Text variant="labelXs" tone={p.status === 'active' ? 'accent' : 'tertiary'}>
                      {p.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text variant="body" tone="tertiary">
                    +{p.rewards_earned.toFixed(4)} earned · matures {format(new Date(p.matures_at), 'MMM d, yyyy')}
                  </Text>
                </View>
                <Divider />
              </View>
            ))
          )}
        </Section>

        <View style={{ padding: theme.spacing[4] }}>
          <Text variant="body" tone="tertiary" align="center">
            Open / claim / withdraw flows ship in a follow-up — use the web app for now.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ label, theme, children }: { label: string; theme: ReturnType<typeof useTheme>; children: React.ReactNode }) {
  return (
    <>
      <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2] }}>
        <Text variant="label" tone="tertiary">{label}</Text>
      </View>
      <Divider />
      <View style={{ paddingHorizontal: theme.spacing[4] }}>{children}</View>
      <View style={{ height: theme.spacing[3] }} />
    </>
  );
}
