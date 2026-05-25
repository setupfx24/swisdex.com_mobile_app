import { useEffect, useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Text, Num, Divider, Pressable, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { socialApi, type LeaderboardEntry, type CopyAllocation } from '@/lib/api/earn';
import { ProfileHeader } from '../profile';

export default function CopyScreen() {
  const theme = useTheme();
  const [board, setBoard] = useState<LeaderboardEntry[] | null>(null);
  const [my, setMy] = useState<CopyAllocation[] | null>(null);

  const load = async () => {
    // Normalise — gateway shapes vary (array, {items:[]}, null). Always
    // land state on a real array so .map can't throw on render.
    try {
      const res = await socialApi.leaderboard();
      const list = Array.isArray(res)
        ? res
        : Array.isArray((res as { items?: LeaderboardEntry[] })?.items)
          ? (res as { items: LeaderboardEntry[] }).items
          : [];
      setBoard(list);
    } catch { setBoard([]); }
    try {
      const res = await socialApi.myCopies();
      const list = Array.isArray(res)
        ? res
        : Array.isArray((res as { items?: CopyAllocation[] })?.items)
          ? (res as { items: CopyAllocation[] }).items
          : [];
      setMy(list);
    } catch { setMy([]); }
  };
  useEffect(() => { void load(); }, []);

  const onStop = (a: CopyAllocation) => {
    Alert.alert(
      'Stop copying?',
      'New trades from this master will no longer be mirrored.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              await socialApi.stopCopy(a.id);
              setMy((prev) => (prev ? prev.filter((x) => x.id !== a.id) : prev));
            } catch (e: unknown) {
              Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Copy trading' }} />
      <ProfileHeader title="Copy trading" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[8] }}>
        <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2] }}>
          <Text variant="label" tone="tertiary">MY COPIES</Text>
        </View>
        <Divider />
        {my === null ? (
          <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={2} /></View>
        ) : my.length === 0 ? (
          <View style={{ padding: theme.spacing[6] }}>
            <Text variant="bodyMd" tone="tertiary" align="center">You aren't copying anyone yet.</Text>
          </View>
        ) : (
          my.map((a) => (
            <View key={a.id}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: theme.spacing[4],
                  paddingVertical: theme.spacing[3],
                }}
              >
                <View>
                  <Text variant="bodyMd" weight="medium">Master {a.master_user_id.slice(0, 8)}…</Text>
                  <Text variant="body" tone="tertiary">${a.amount} · {a.status.toUpperCase()}</Text>
                </View>
                <Pressable
                  onPress={() => onStop(a)}
                  haptic="medium"
                  style={({ pressed }) => ({
                    paddingVertical: theme.spacing[1],
                    paddingHorizontal: theme.spacing[3],
                    borderRadius: theme.radius.md,
                    backgroundColor: pressed ? theme.colors.sellBg : 'transparent',
                    borderWidth: 1, borderColor: theme.colors.sell,
                  })}
                >
                  <Text variant="labelXs" tone="sell" weight="bold">STOP</Text>
                </Pressable>
              </View>
              <Divider inset={theme.spacing[4]} />
            </View>
          ))
        )}

        <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2] }}>
          <Text variant="label" tone="tertiary">LEADERBOARD</Text>
        </View>
        <Divider />
        {board === null ? (
          <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={5} /></View>
        ) : board.length === 0 ? (
          <View style={{ padding: theme.spacing[6] }}>
            <Text variant="bodyMd" tone="tertiary" align="center">No traders to copy yet.</Text>
          </View>
        ) : (
          board.map((e, i) => (
            <View key={e.user_id}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: theme.spacing[4],
                  paddingVertical: theme.spacing[3],
                  gap: theme.spacing[3],
                }}
              >
                <Text variant="labelXs" tone="tertiary" style={{ width: 24 }}>#{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMd" weight="medium">
                    {e.first_name ?? 'Trader'} {(e.last_name ?? '').slice(0, 1)}.
                    {e.is_verified ? ' ✓' : ''}
                  </Text>
                  <Text variant="body" tone="tertiary">
                    {e.followers_count} followers{e.sharpe_ratio != null ? ` · Sharpe ${e.sharpe_ratio.toFixed(2)}` : ''}
                  </Text>
                </View>
                <Num value={e.total_return_pct} digits={1} suffix="%" pnl signed variant="numLg" />
              </View>
              <Divider inset={theme.spacing[4]} />
            </View>
          ))
        )}

        <View style={{ padding: theme.spacing[4] }}>
          <Text variant="body" tone="tertiary" align="center">
            Start-copy + PAMM invest flows ship in a follow-up — for now,
            view-only + stop-copy.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
