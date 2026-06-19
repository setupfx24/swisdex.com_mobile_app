import { useState, useRef } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, type TextInput as RNTextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { Text, Field, Button, Divider, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { ApiError, ApiNetworkError, apiConfig } from '@/lib/api';

/** Login screen. Two-stage flow:
 *  1) Submit email + password.
 *  2) If backend responds with "2FA code required" (a 400 from auth_service
 *     login_user), reveal the TOTP field and re-submit with the code.
 *  Backend bumps the rate-limit at 10/min — UI surfaces 429s as "Too many
 *  attempts, try again in a minute". */
export default function LoginScreen() {
  const theme = useTheme();
  const completeAuth = useAuthStore((s) => s.completeAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totp, setTotp] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totpRef = useRef<RNTextInput>(null);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setSubmitting(true);
    try {
      const tokens = await authApi.login({
        email: email.trim(),
        password,
        totp_code: needsTotp ? totp.trim() : undefined,
      });
      await completeAuth(tokens);
      router.replace('/markets');
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        // Backend signals 2FA via the AuthServiceError message string. Match
        // on the substring rather than the (untyped) detail field.
        if (!needsTotp && /2fa|totp|code required/i.test(e.message)) {
          setNeedsTotp(true);
          setError(null);
          // Focus the TOTP field on next paint.
          requestAnimationFrame(() => totpRef.current?.focus());
        } else if (e.status === 429) {
          setError('Too many attempts. Wait a minute and try again.');
        } else {
          setError(e.message);
        }
      } else if (e instanceof ApiNetworkError) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : 'Could not sign in.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onDemo = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const tokens = await authApi.demoLogin();
      await completeAuth(tokens);
      router.replace('/markets');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Demo sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const googleEnabled = !!apiConfig.googleClientId;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing[5],
            paddingTop: theme.spacing[10],
            paddingBottom: theme.spacing[8],
            gap: theme.spacing[5],
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <Text variant="h1">Sign in</Text>
            <View style={{ height: theme.spacing[1] }} />
            <Text variant="bodyMd" tone="secondary">to your SwisDex account</Text>
          </View>

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="next"
            editable={!submitting}
          />

          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            autoComplete="password"
            returnKeyType={needsTotp ? 'next' : 'go'}
            onSubmitEditing={() => {
              if (!needsTotp) void onSubmit();
            }}
            editable={!submitting}
            rightSlot={
              <Pressable
                haptic="light"
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                style={{ padding: theme.spacing[1] }}
              >
                {showPassword ? (
                  <EyeOff size={20} color={theme.colors.text.secondary} strokeWidth={1.85} />
                ) : (
                  <Eye size={20} color={theme.colors.text.secondary} strokeWidth={1.85} />
                )}
              </Pressable>
            }
          />

          {needsTotp ? (
            <Field
              ref={totpRef}
              label="2FA code"
              hint="6-digit code from your authenticator app"
              value={totp}
              onChangeText={setTotp}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="one-time-code"
              returnKeyType="go"
              onSubmitEditing={() => void onSubmit()}
              editable={!submitting}
            />
          ) : null}

          {error ? (
            <View
              style={{
                padding: theme.spacing[3],
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.sellBg,
                borderWidth: 1,
                borderColor: theme.colors.sell,
              }}
            >
              <Text variant="body" tone="sell">{error}</Text>
            </View>
          ) : null}

          <Button onPress={onSubmit} loading={submitting} size="lg">
            {needsTotp ? 'Verify & sign in' : 'Sign in'}
          </Button>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Link href="/(auth)/forgot-password" style={{ color: theme.colors.text.accent }}>
              <Text variant="bodyMd" tone="accent">Forgot password</Text>
            </Link>
            <Link href="/(auth)/register" style={{ color: theme.colors.text.accent }}>
              <Text variant="bodyMd" tone="accent">Create account</Text>
            </Link>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] }}>
            <Divider style={{ flex: 1 }} />
            <Text variant="labelXs" tone="tertiary">OR</Text>
            <Divider style={{ flex: 1 }} />
          </View>

          <Button
            variant="secondary"
            onPress={() => {
              // TODO(phase-4-followup): wire expo-auth-session Google provider
              // once EXPO_PUBLIC_GOOGLE_CLIENT_ID is configured. See
              // https://docs.expo.dev/versions/v56.0.0/sdk/auth-session/.
              // For now the button is a placeholder so the layout is correct.
              setError(
                googleEnabled
                  ? 'Google sign-in scaffold is pending the expo-auth-session wiring (Phase 4 follow-up).'
                  : 'Google sign-in is disabled — set EXPO_PUBLIC_GOOGLE_CLIENT_ID and rebuild.',
              );
            }}
            disabled={!googleEnabled || submitting}
          >
            Continue with Google
          </Button>

          <Button variant="ghost" onPress={onDemo} disabled={submitting}>
            Try a demo account
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
