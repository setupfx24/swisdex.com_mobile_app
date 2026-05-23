import { useEffect, useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Text, Num, Divider, Button, Pressable, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { rewardsApi, type RewardsState, type Mission } from '@/lib/api/earn';
import { ProfileHeader } from '../profile';

export default function RewardsScreen() {
  const theme = useTheme();
  const [state, setState] = useState<RewardsState | null>(null);
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const load = async () => {
    setState(await rewardsApi.state().catch(() => null));
    setMissions(await rewardsApi.missions().catch(() => []));
  };
  useEffect(() => { void load(); }, []);

  const onCheckIn = async () => {
    setCheckingIn(true);
    try {
      const r = await rewardsApi.checkIn();
      setState((s) => (s ? { ...s, streak_days: r.streak_days } : s));
    } catch (e: unknown) {
      Alert.alert('Already checked in', e instanceof Error ? e.message : 'Try again tomorrow.');
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Rewards' }} />
      <ProfileHeader title="Rewards" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[10] }}>
        {state ? (
          <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Stat label="XP" value={state.xp} />
              <Stat label="Coins" value={state.artha_coins} />
              <Stat label="Power" value={state.power_score} digits={2} />
              <Stat label="Streak" value={state.streak_days} suffix="d" />
            </View>
          </View>
        ) : (
          <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={2} /></View>
        )}

        <View style={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[3] }}>
          <Button onPress={onCheckIn} loading={checkingIn}>Daily check-in</Button>
        </View>

        <Divider />
        <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2] }}>
          <Text variant="label" tone="tertiary">MISSIONS</Text>
        </View>
        <Divider />

        {missions === null ? (
          <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={4} /></View>
        ) : missions.length === 0 ? (
          <View style={{ padding: theme.spacing[6] }}>
            <Text variant="bodyMd" tone="tertiary" align="center">No missions available.</Text>
          </View>
        ) : (
          missions.map((m) => (
            <View key={m.id}>
              <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
                      <Text variant="bodyMd" weight="medium">{m.title}</Text>
                      <Text variant="labelXs" tone="tertiary">{m.type.toUpperCase()}</Text>
                    </View>
                    {m.description ? <Text variant="body" tone="tertiary" numberOfLines={2}>{m.description}</Text> : null}
                    <Text variant="labelXs" tone="tertiary">
                      {m.progress} / {m.goal}{m.reward_xp ? ` · +${m.reward_xp} XP` : ''}{m.reward_coins ? ` · +${m.reward_coins} coins` : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={async () => {
                      try {
                        await rewardsApi.claim(m.id);
                        await load();
                      } catch (e: unknown) {
                        Alert.alert('Not yet', e instanceof Error ? e.message : 'Cannot claim');
                      }
                    }}
                    disabled={m.claimed || m.progress < m.goal}
                    haptic="medium"
                    style={({ pressed }) => ({
                      paddingVertical: theme.spacing[1],
                      paddingHorizontal: theme.spacing[3],
                      borderRadius: theme.radius.md,
                      backgroundColor: m.claimed
                        ? theme.colors.bg.tertiary
                        : m.progress < m.goal
                          ? theme.colors.bg.secondary
                          : pressed ? theme.colors.buyDark : theme.colors.buy,
                      borderWidth: 1,
                      borderColor: m.claimed ? theme.colors.border.primary : theme.colors.buy,
                      opacity: m.claimed || m.progress < m.goal ? 0.6 : 1,
                    })}
                  >
                    <Text variant="labelXs" tone={m.claimed ? 'tertiary' : 'inverse'} weight="bold">
                      {m.claimed ? 'CLAIMED' : 'CLAIM'}
                    </Text>
                  </Pressable>
                </View>
              </View>
              <Divider inset={theme.spacing[4]} />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, suffix, digits = 0 }: { label: string; value: number; suffix?: string; digits?: number }) {
  return (
    <View>
      <Text variant="labelXs" tone="tertiary">{label}</Text>
      <Num value={value} digits={digits} suffix={suffix} variant="numLg" />
    </View>
  );
}
