import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import { Text, Num, Divider, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { insuranceApi, insuranceReasonLabel, type InsurancePolicy } from '@/lib/api/earn';
import { ProfileHeader } from '../profile';

type Tone = 'buy' | 'sell' | 'tertiary' | 'accent';

function statusTone(status: string): Tone {
  switch (status) {
    case 'active': return 'accent';
    case 'claimed': return 'buy';
    case 'denied': return 'sell';
    case 'expired': return 'tertiary';
    default: return 'tertiary';
  }
}

function toArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object' && Array.isArray((res as { items?: T[] }).items)) {
    return (res as { items: T[] }).items;
  }
  return [];
}

export default function InsuranceScreen() {
  const theme = useTheme();
  const [policies, setPolicies] = useState<InsurancePolicy[] | null>(null);
  const [claims, setClaims] = useState<{ id: string; policy_id: string; payout: number; created_at: string }[] | null>(null);

  useEffect(() => {
    // Full policy ledger (active + denied + expired + claimed) — mirrors the
    // web "Policies" section. /active is a subset; /policies is everything.
    insuranceApi.policies().then((r) => setPolicies(toArray<InsurancePolicy>(r))).catch(() => setPolicies([]));
    insuranceApi.claims().then((r) => setClaims(toArray(r))).catch(() => setClaims([]));
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Insurance' }} />
      <ProfileHeader title="Trade insurance" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[8] }}>
        <Section label="POLICIES" theme={theme}>
          {policies === null ? (
            <SkeletonRow count={3} />
          ) : policies.length === 0 ? (
            <Text variant="bodyMd" tone="tertiary" align="center">No policies yet.</Text>
          ) : (
            policies.map((p) => {
              const sym = p.instrument_symbol ?? p.symbol ?? '—';
              const tone = statusTone(p.status);
              const reason = insuranceReasonLabel(p.settled_reason);
              const ended = p.status !== 'active' && p.settled_at;
              return (
                <View key={p.id}>
                  <View style={{ paddingVertical: theme.spacing[3], gap: 4 }}>
                    {/* Row 1: status badge + symbol + tier + coverage / fee */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], flex: 1 }}>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: theme.radius.sm,
                            backgroundColor:
                              tone === 'sell' ? theme.colors.sellBg
                              : tone === 'buy' || tone === 'accent' ? theme.colors.buyBg
                              : theme.colors.bg.chip,
                          }}
                        >
                          <Text variant="caption" weight="bold" tone={tone === 'tertiary' ? 'tertiary' : tone}>
                            {p.status.toUpperCase()}
                          </Text>
                        </View>
                        <Text variant="bodyMd" weight="medium">{sym}</Text>
                        <Text variant="labelXs" tone="accent">{p.coverage_pct.toFixed(0)}%</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="bodyB" tone="primary">${p.fee.toFixed(2)} fee</Text>
                        <Text variant="caption" tone="tertiary">
                          {p.coverage_pct.toFixed(0)}% covered · max ${p.max_cap.toFixed(0)}
                        </Text>
                      </View>
                    </View>

                    {/* Row 2: denial reason (denied/expired) */}
                    {reason && (p.status === 'denied' || p.status === 'expired') ? (
                      <Text variant="body" tone="sell">
                        {p.status === 'denied' ? 'Declined: ' : 'Expired: '}{reason}
                      </Text>
                    ) : null}

                    {/* Row 3: settled / expiry timestamp */}
                    {ended ? (
                      <Text variant="caption" tone="tertiary">
                        {p.status === 'expired' ? 'Expired ' : 'Settled '}
                        {format(new Date(p.settled_at as string), 'MMM d, yyyy · HH:mm')}
                      </Text>
                    ) : (
                      <Text variant="caption" tone="tertiary">
                        Activated {format(new Date(p.activated_at), 'MMM d, yyyy · HH:mm')}
                      </Text>
                    )}
                  </View>
                  <Divider />
                </View>
              );
            })
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
