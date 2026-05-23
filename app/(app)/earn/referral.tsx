import { useEffect, useState } from 'react';
import { ScrollView, View, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Copy, Share2 } from 'lucide-react-native';
import { Text, Num, Divider, Button, Pressable, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { businessApi, type BusinessSnapshot } from '@/lib/api/earn';
import { ProfileHeader } from '../profile';

export default function ReferralScreen() {
  const theme = useTheme();
  const [snap, setSnap] = useState<BusinessSnapshot | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    businessApi.snapshot().then(setSnap).catch(() => setSnap(null));
  }, []);

  const copy = async () => {
    if (!snap?.referral_code) return;
    await Clipboard.setStringAsync(snap.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1_500);
  };

  const share = async () => {
    if (!snap?.referral_code) return;
    await Share.share({
      message: `Trade with me on SwisDex — use my code ${snap.referral_code} to claim the welcome bonus.`,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Referral / IB' }} />
      <ProfileHeader title="Referral / IB" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[8] }}>
        {snap === null ? (
          <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={4} /></View>
        ) : (
          <>
            {snap.referral_code ? (
              <View
                style={{
                  margin: theme.spacing[4],
                  padding: theme.spacing[4],
                  borderRadius: theme.radius.xl,
                  backgroundColor: theme.colors.bg.secondary,
                  borderWidth: 1,
                  borderColor: theme.colors.border.primary,
                  alignItems: 'center',
                  gap: theme.spacing[2],
                }}
              >
                <Text variant="labelXs" tone="tertiary">YOUR CODE</Text>
                <Text variant="numXxl" weight="bold" style={{ letterSpacing: 2 }}>{snap.referral_code}</Text>
                <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
                  <Pressable
                    onPress={copy}
                    haptic="light"
                    style={({ pressed }) => ({
                      flexDirection: 'row', gap: theme.spacing[1],
                      paddingVertical: theme.spacing[1], paddingHorizontal: theme.spacing[3],
                      borderRadius: theme.radius.md,
                      backgroundColor: pressed ? theme.colors.bg.active : theme.colors.bg.primary,
                      borderWidth: 1, borderColor: theme.colors.border.primary,
                      alignItems: 'center',
                    })}
                  >
                    <Copy size={14} color={theme.colors.text.primary} />
                    <Text variant="labelXs" weight="medium">{copied ? 'COPIED' : 'COPY'}</Text>
                  </Pressable>
                  <Pressable
                    onPress={share}
                    haptic="light"
                    style={({ pressed }) => ({
                      flexDirection: 'row', gap: theme.spacing[1],
                      paddingVertical: theme.spacing[1], paddingHorizontal: theme.spacing[3],
                      borderRadius: theme.radius.md,
                      backgroundColor: pressed ? theme.colors.buyDark : theme.colors.buy,
                      borderWidth: 1, borderColor: theme.colors.buy,
                      alignItems: 'center',
                    })}
                  >
                    <Share2 size={14} color="#fff" />
                    <Text variant="labelXs" weight="bold" tone="inverse">SHARE</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ padding: theme.spacing[6] }}>
                <Text variant="bodyMd" tone="tertiary" align="center">
                  You don't have a referral code yet. Activate the IB program from the web app to claim one.
                </Text>
              </View>
            )}

            <Divider />
            <View
              style={{
                paddingHorizontal: theme.spacing[4],
                paddingVertical: theme.spacing[3],
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Stat label="Referrals" value={snap.total_referrals} />
              <Stat label="Active" value={snap.active_referrals} />
              <Stat label="Pending" value={snap.commissions_pending} digits={2} prefix="$" />
              <Stat label="Paid" value={snap.commissions_paid} digits={2} prefix="$" />
            </View>
            <Divider />
            {snap.tier_name ? (
              <View style={{ padding: theme.spacing[4] }}>
                <Text variant="label" tone="tertiary">TIER</Text>
                <Text variant="bodyLg" weight="bold">{snap.tier_name}</Text>
                {snap.next_tier_at ? (
                  <Text variant="body" tone="tertiary">
                    {snap.next_tier_at - snap.total_referrals} more referrals to next tier
                  </Text>
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, digits = 0, prefix }: { label: string; value: number; digits?: number; prefix?: string }) {
  return (
    <View>
      <Text variant="labelXs" tone="tertiary">{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        {prefix ? <Text variant="bodyMd" tone="tertiary">{prefix}</Text> : null}
        <Num value={value} digits={digits} variant="numLg" />
      </View>
    </View>
  );
}
