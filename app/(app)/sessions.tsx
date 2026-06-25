import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import { Text, Divider, Pressable, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { profileApi } from '@/lib/api/profile';
import type { Session } from '@/types/accounts';
import { ProfileHeader } from './profile';

export default function SessionsScreen() {
  const theme = useTheme();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSessions(await profileApi.listSessions());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load sessions.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const revoke = (s: Session) => {
    Alert.alert(
      'Sign out this device?',
      `${s.user_agent ?? 'Unknown device'}\n${s.ip_address ?? ''}`.trim(),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            try {
              await profileApi.revokeSession(s.id);
              setSessions((prev) => (prev ? prev.filter((x) => x.id !== s.id) : prev));
            } catch (e: unknown) {
              Alert.alert('Failed', e instanceof Error ? e.message : 'Could not revoke');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <Stack.Screen options={{ title: 'Active sessions' }} />
      <ProfileHeader title="Active sessions" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing[8] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.text.secondary}
          />
        }
      >
        {sessions === null ? (
          <View style={{ padding: theme.spacing[4] }}>
            <SkeletonRow count={4} />
          </View>
        ) : sessions.length === 0 ? (
          <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[6] }}>
            <Text variant="bodyMd" tone="tertiary" align="center">No active sessions.</Text>
          </View>
        ) : (
          sessions.map((s, i) => (
            <View key={s.id}>
              {i === 0 ? <Divider /> : null}
              <Pressable
                onPress={() => (s.is_current ? undefined : revoke(s))}
                haptic={s.is_current ? null : 'light'}
                style={({ pressed }) => ({
                  paddingHorizontal: theme.spacing[4],
                  paddingVertical: theme.spacing[3],
                  backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="bodyMd" weight="medium">{s.user_agent ?? 'Unknown device'}</Text>
                  {s.is_current ? (
                    <Text variant="labelXs" tone="buy">CURRENT</Text>
                  ) : (
                    <Text variant="labelXs" tone="sell">REVOKE</Text>
                  )}
                </View>
                <View style={{ height: 2 }} />
                <Text variant="body" tone="tertiary">
                  {s.ip_address ?? 'IP unknown'} · last used{' '}
                  {s.last_used_at ? format(new Date(s.last_used_at), 'MMM d, HH:mm') : 'never'}
                </Text>
              </Pressable>
              <Divider />
            </View>
          ))
        )}
        {error ? (
          <View style={{ padding: theme.spacing[4] }}>
            <Text variant="body" tone="sell">{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
