import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, TextInput as RNTextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Text, Field, Button } from '@/ui';
import { useTheme } from '@/theme';
import { supportApi } from '@/lib/api/support';
import { ProfileHeader } from '../profile';

export default function NewTicketScreen() {
  const theme = useTheme();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!subject.trim() || !body.trim()) return setError('Subject and message are required.');
    setSubmitting(true);
    try {
      const t = await supportApi.createTicket({ subject: subject.trim(), body: body.trim() });
      router.replace({ pathname: '/support/[id]', params: { id: t.id } });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not create ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'New ticket' }} />
      <ProfileHeader title="New ticket" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
          <Field label="Subject" value={subject} onChangeText={setSubject} editable={!submitting} />
          <View>
            <Text variant="label" tone="secondary">Message</Text>
            <View style={{ height: theme.spacing[1] }} />
            <View
              style={{
                backgroundColor: theme.colors.bg.input,
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: theme.colors.border.primary,
              }}
            >
              <RNTextInput
                value={body}
                onChangeText={setBody}
                placeholder="Describe the issue…"
                placeholderTextColor={theme.colors.text.tertiary}
                multiline
                editable={!submitting}
                style={{
                  minHeight: 140,
                  padding: theme.spacing[3],
                  color: theme.colors.text.primary,
                  fontSize: theme.sizes.md,
                  textAlignVertical: 'top',
                }}
              />
            </View>
          </View>
          {error ? <Text variant="body" tone="sell">{error}</Text> : null}
          <Button onPress={onSubmit} loading={submitting} size="lg">Submit ticket</Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
