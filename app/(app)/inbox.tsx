import { useEffect, useCallback, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import { Text, Divider, Pressable, Button, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { ProfileHeader } from './profile';

export default function InboxScreen() {
  const theme = useTheme();
  const items = useNotificationsStore((s) => s.items);
  const unread = useNotificationsStore((s) => s.unread);
  const loading = useNotificationsStore((s) => s.loading);
  const refresh = useNotificationsStore((s) => s.refresh);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Inbox' }} />
      <ProfileHeader title={`Inbox${unread > 0 ? ` (${unread})` : ''}`} />
      {unread > 0 ? (
        <View style={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[2] }}>
          <Button variant="ghost" fullWidth={false} onPress={() => { void markAllRead(); }}>
            Mark all read
          </Button>
        </View>
      ) : null}
      {loading && items.length === 0 ? (
        <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={5} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text.secondary} />}
          renderItem={({ item }) => (
            <View>
              <Pressable
                onPress={() => { if (!item.is_read) void markRead(item.id); }}
                haptic="light"
                style={({ pressed }) => ({
                  paddingHorizontal: theme.spacing[4],
                  paddingVertical: theme.spacing[3],
                  backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
                  flexDirection: 'row',
                  gap: theme.spacing[3],
                })}
              >
                <View
                  style={{
                    width: 6, height: 6, borderRadius: 3,
                    backgroundColor: item.is_read ? 'transparent' : theme.colors.buy,
                    marginTop: 8,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="bodyMd" weight={item.is_read ? 'medium' : 'bold'}>{item.title}</Text>
                    <Text variant="labelXs" tone="tertiary">
                      {format(new Date(item.created_at), 'MMM d HH:mm')}
                    </Text>
                  </View>
                  <Text variant="body" tone="secondary" numberOfLines={2}>{item.body}</Text>
                </View>
              </Pressable>
              <Divider inset={theme.spacing[4]} />
            </View>
          )}
          ListEmptyComponent={
            <View style={{ padding: theme.spacing[6] }}>
              <Text variant="bodyMd" tone="tertiary" align="center">No notifications yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
