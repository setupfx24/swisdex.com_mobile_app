import { useEffect, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, TextInput as RNTextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, Divider, Button, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { safeFormat } from '@/lib/date';
import { supportApi } from '@/lib/api/support';
import type { SupportMessage, SupportTicket } from '@/types/notifications';
import { ProfileHeader } from '../profile';

export default function TicketDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ticket, setTicket] = useState<(SupportTicket & { messages: SupportMessage[] }) | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = async () => {
    try { setTicket(await supportApi.getTicket(String(id))); } catch { /* swallow */ }
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await supportApi.reply(String(id), reply.trim());
      setReply('');
      await load();
    } finally { setSending(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Ticket' }} />
      <ProfileHeader title={ticket?.subject ?? 'Ticket'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: theme.spacing[4] }}
        >
          {!ticket ? (
            <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={5} /></View>
          ) : (
            <>
              <View style={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[2] }}>
                <Text variant="labelXs" tone="accent">{ticket.status.replace('_', ' ').toUpperCase()}</Text>
                <Text variant="labelXs" tone="tertiary">Opened {safeFormat(ticket.created_at)}</Text>
              </View>
              <Divider />
              {ticket.messages.map((m) => (
                <View key={m.id}>
                  <View
                    style={{
                      paddingHorizontal: theme.spacing[4],
                      paddingVertical: theme.spacing[3],
                      backgroundColor: m.is_admin ? theme.colors.bg.secondary : 'transparent',
                    }}
                  >
                    <Text variant="labelXs" tone={m.is_admin ? 'accent' : 'tertiary'}>
                      {m.is_admin ? 'SUPPORT' : 'YOU'} · {safeFormat(m.created_at, 'MMM d HH:mm')}
                    </Text>
                    <View style={{ height: 2 }} />
                    <Text variant="bodyMd">{m.message}</Text>
                  </View>
                  <Divider />
                </View>
              ))}
            </>
          )}
        </ScrollView>

        {ticket && ticket.status !== 'closed' ? (
          <View
            style={{
              padding: theme.spacing[3],
              borderTopWidth: 1,
              borderTopColor: theme.colors.border.primary,
              backgroundColor: theme.colors.bg.secondary,
              gap: theme.spacing[2],
            }}
          >
            <View
              style={{
                backgroundColor: theme.colors.bg.input,
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: theme.colors.border.primary,
              }}
            >
              <RNTextInput
                value={reply}
                onChangeText={setReply}
                placeholder="Reply…"
                placeholderTextColor={theme.colors.text.tertiary}
                multiline
                style={{
                  minHeight: 60,
                  padding: theme.spacing[3],
                  color: theme.colors.text.primary,
                  fontSize: theme.sizes.md,
                  textAlignVertical: 'top',
                }}
              />
            </View>
            <Button onPress={send} loading={sending}>Send reply</Button>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
