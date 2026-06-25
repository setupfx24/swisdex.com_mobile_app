import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Text, Button } from '@/ui';
import { useTheme } from '@/theme';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/lib/api';

/** Handles deep-link swisdex://auth/verify-email?token=…
 *  Backend's verify endpoint returns a TokenResponse with cookies + (with
 *  the Phase-1 patch) the refresh token in JSON body, so we can sign the
 *  user straight in. */
export default function VerifyEmailScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ token?: string }>();
  const completeAuth = useAuthStore((s) => s.completeAuth);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const token = (params.token ?? '').trim();
    if (!token) {
      setError('Verification link is missing the token. Try clicking the link again, or request a new one.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const tokens = await authApi.verifyEmail(token);
        if (cancelled) return;
        await completeAuth(tokens);
        setDone(true);
        // Bounce to app home after a brief beat so the success text is visible.
        setTimeout(() => {
          if (!cancelled) router.replace('/markets');
        }, 800);
      } catch (e: unknown) {
        if (cancelled) return;
        if (e instanceof ApiError) {
          setError(e.message);
        } else {
          setError(e instanceof Error ? e.message : 'Verification failed.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.token, completeAuth]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View
        style={{
          paddingHorizontal: theme.spacing[5],
          paddingTop: theme.spacing[10],
          gap: theme.spacing[4],
        }}
      >
        {!error && !done ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] }}>
            <ActivityIndicator color={theme.colors.buy} />
            <Text variant="bodyLg">Verifying your email…</Text>
          </View>
        ) : null}

        {done ? (
          <>
            <Text variant="h1">You're in</Text>
            <Text variant="bodyMd" tone="secondary">Email verified — taking you to your dashboard.</Text>
          </>
        ) : null}

        {error ? (
          <>
            <Text variant="h1">Verification failed</Text>
            <Text variant="bodyMd" tone="sell">{error}</Text>
            <Button onPress={() => router.replace('/(auth)/login')}>Back to sign in</Button>
            <Link href="/(auth)/register">
              <Text variant="bodyMd" tone="accent" align="center">Need a new verification link?</Text>
            </Link>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
