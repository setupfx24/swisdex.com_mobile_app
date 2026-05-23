import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Text, Field, Button } from '@/ui';
import { useTheme } from '@/theme';
import { authApi } from '@/lib/api/auth';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not send reset link.');
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
        <View>
          <Text variant="h1">Reset password</Text>
          <View style={{ height: theme.spacing[1] }} />
          <Text variant="bodyMd" tone="secondary">
            We'll email you a link to choose a new password.
          </Text>
        </View>

        {sent ? (
          <View
            style={{
              padding: theme.spacing[3],
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.bg.secondary,
              borderWidth: 1,
              borderColor: theme.colors.border.primary,
            }}
          >
            <Text variant="bodyMd">
              If <Text variant="bodyMd" weight="medium">{email}</Text> is a registered
              account, you'll receive an email with reset instructions in the
              next few minutes.
            </Text>
          </View>
        ) : (
          <>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="go"
              onSubmitEditing={() => void onSubmit()}
              editable={!submitting}
            />
            {error ? <Text variant="body" tone="sell">{error}</Text> : null}
            <Button onPress={onSubmit} loading={submitting} size="lg">
              Send reset link
            </Button>
          </>
        )}

        <Link href="/(auth)/login" replace>
          <Text variant="bodyMd" tone="accent" align="center">Back to sign in</Text>
        </Link>
      </View>
    </SafeAreaView>
  );
}
