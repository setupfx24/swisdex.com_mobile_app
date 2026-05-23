import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Text, Field, Button } from '@/ui';
import { useTheme } from '@/theme';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api';

/** Handles deep-link swisdex://auth/reset-password?token=…
 *  scheme is registered in app.json. The web trader's reset email already
 *  points users at https://trade.swisdex.com/auth/reset-password — to
 *  redirect those clicks into the mobile app on devices that have it
 *  installed, the web page can detect a mobile UA and link to the scheme
 *  variant. (Out of mobile scope; documenting for the web team.) */
export default function ResetPasswordScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = (params.token ?? '').trim();

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!token) {
      setError('This reset link is missing the token. Request a new one.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (e: unknown) {
      if (e instanceof ApiError) setError(e.message);
      else setError(e instanceof Error ? e.message : 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }}>
      <View
        style={{
          paddingHorizontal: theme.spacing[5],
          paddingTop: theme.spacing[10],
          gap: theme.spacing[4],
        }}
      >
        <Text variant="h1">Set a new password</Text>

        {!token ? (
          <Text variant="bodyMd" tone="sell">
            This reset link is missing the token. Request a new one.
          </Text>
        ) : done ? (
          <>
            <Text variant="bodyMd" tone="secondary">
              Done. You can sign in with your new password.
            </Text>
            <Button onPress={() => router.replace('/(auth)/login')}>Sign in</Button>
          </>
        ) : (
          <>
            <Field
              label="New password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="go"
              onSubmitEditing={() => void onSubmit()}
              editable={!submitting}
            />
            {error ? <Text variant="body" tone="sell">{error}</Text> : null}
            <Button onPress={onSubmit} loading={submitting} size="lg">
              Reset password
            </Button>
            <Link href="/(auth)/login" replace>
              <Text variant="bodyMd" tone="accent" align="center">Back to sign in</Text>
            </Link>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
