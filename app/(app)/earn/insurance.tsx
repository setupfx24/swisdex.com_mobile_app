import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import { Text, Num, Divider, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { insuranceApi, type InsurancePolicy } from '@/lib/api/earn';
import { ProfileHeader } from '../profile';

export default function InsuranceScreen() {
  const theme = useTheme();
  const [active, setActive] = useState<InsurancePolicy[] | null>(null);
  const [claims, setClaims] = useState<{ id: string; policy_id: string; payout: number; created_at: string }[] | null>(null);

  useEffect(() => {
    insuranceApi.active().then(setActive).catch(() => setActive([]));
    insuranceApi.claims().then(setClaims).catch(() => setClaims([]));
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Insurance' }} />
      <ProfileHeader title="Trade insurance" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[8] }}>
        <Section label="ACTIVE POLICIES" theme={theme}>
          {active === null ? <SkeletonRow count={2} /> : active.length === 0 ? (
            <Text variant="bodyMd" tone="tertiary" align="center">No active policies.</Text>
          ) : (
            active.map((p) => (
              <View key={p.id}>
                <View style={{ paddingVertical: theme.spacing[3] }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="bodyMd" weight="medium">{p.symbol} · {p.tier.toUpperCase()}</Text>
                    <Text variant="labelXs" tone="accent">{p.coverage_pct.toFixed(0)}% cover</Text>
                  </View>
                  <Text variant="body" tone="tertiary">
                    Fee ${p.fee.toFixed(2)} · cap ${p.max_cap.toFixed(2)}
                  </Text>
                </View>
                <Divider />
              </View>
            ))
          )}
        </Section>

        <Section label="CLAIMS PAID" theme={theme}>
          {claims === null ? <SkeletonRow count={2} /> : claims.length === 0 ? (
            <Text variant="bodyMd" tone="tertiary" align="center">No claims yet.</Text>
          ) : (
            claims.map((c) => (
              <View key={c.id}>
                <View style={{ paddingVertical: theme.spacing[3], flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="body" tone="tertiary">{format(new Date(c.created_at), 'MMM d, yyyy')}</Text>
                  <Num value={c.payout} digits={2} pnl variant="num" />
                </View>
                <Divider />
              </View>
            ))
          )}
        </Section>

        <View style={{ padding: theme.spacing[4] }}>
          <Text variant="body" tone="tertiary" align="center">
            Quote + activate flow ships in a follow-up — for now, insure new
            positions from the web app.
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
