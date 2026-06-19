import { useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Text, Divider, Pressable, Button, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { safeFormat } from '@/lib/date';
import { supportApi } from '@/lib/api/support';
import type { SupportTicket } from '@/types/notifications';
import { ProfileHeader } from '../profile';

export default function SupportListScreen() {
  const theme = useTheme();
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { setTickets(await supportApi.listTickets()); } catch { setTickets([]); }
  };
  useEffect(() => { void load(); }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Support' }} />
      <ProfileHeader title="Support" />
      <View style={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[3] }}>
        <Button onPress={() => router.push('/support/new')} size="md">+ New ticket</Button>
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            tintColor={theme.colors.text.secondary}
          />
        }
      >
        <Divider />
        {tickets === null ? (
          <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={4} /></View>
        ) : tickets.length === 0 ? (
          <View style={{ padding: theme.spacing[6] }}>
            <Text variant="bodyMd" tone="tertiary" align="center">No support tickets yet.</Text>
          </View>
        ) : (
          tickets.map((t) => (
            <View key={t.id}>
              <Pressable
                onPress={() => router.push({ pathname: '/support/[id]', params: { id: t.id } })}
                haptic="light"
                style={({ pressed }) => ({
                  paddingHorizontal: theme.spacing[4],
                  paddingVertical: theme.spacing[3],
                  backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
                })}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="bodyMd" weight="medium">{t.subject}</Text>
                  <Text variant="labelXs" tone={t.status === 'resolved' || t.status === 'closed' ? 'tertiary' : 'accent'}>
                    {t.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                {t.last_message ? (
                  <Text variant="body" tone="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
                    {t.last_message}
                  </Text>
                ) : null}
                <Text variant="labelXs" tone="tertiary" style={{ marginTop: 2 }}>
                  Updated {safeFormat(t.updated_at)}
                </Text>
              </Pressable>
              <Divider inset={theme.spacing[4]} />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
