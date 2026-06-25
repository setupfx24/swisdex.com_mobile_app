import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Text, Field, Button } from '@/ui';
import { useTheme } from '@/theme';
import { profileApi } from '@/lib/api/profile';
import { ProfileHeader } from './profile';

export default function ProfilePasswordScreen() {
  const theme = useTheme();
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (newPwd.length < 8) return setError('New password must be at least 8 characters.');
    if (newPwd !== confirm) return setError('Passwords do not match.');
    setSubmitting(true);
    try {
      await profileApi.changePassword(oldPwd, newPwd);
      setDone(true);
      setOldPwd(''); setNewPwd(''); setConfirm('');
      setTimeout(() => router.back(), 800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not change password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <Stack.Screen options={{ title: 'Change password' }} />
      <ProfileHeader title="Change password" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing[4],
            paddingTop: theme.spacing[2],
            paddingBottom: theme.spacing[8],
            gap: theme.spacing[3],
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Field label="Current password" value={oldPwd} onChangeText={setOldPwd} secureTextEntry editable={!submitting} />
          <Field label="New password" value={newPwd} onChangeText={setNewPwd} secureTextEntry editable={!submitting} hint="At least 8 characters." />
          <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry editable={!submitting} />
          {error ? <Text variant="body" tone="sell">{error}</Text> : null}
          {done ? <Text variant="body" tone="buy">Password changed.</Text> : null}
          <Button onPress={onSubmit} loading={submitting} size="lg">Update password</Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
