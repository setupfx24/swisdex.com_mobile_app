import { useState, useEffect } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { Text, Field, Button } from '@/ui';
import { useTheme } from '@/theme';
import { authApi } from '@/lib/api/auth';
import { apiConfig, ApiError, ApiNetworkError } from '@/lib/api';
import { TurnstileWidget } from '@/features/auth/TurnstileWidget';
import type { PlatformStatus } from '@/types/auth';

/** Email/password registration. On success the user is NOT signed in —
 *  email_verified is false on the server until they click the verify link.
 *  We send them to a "check your email" view that lets them resend the
 *  link. Verification flips email_verified=true and (per backend behaviour)
 *  also issues a session — handled by app/(auth)/verify-email.tsx. */
export default function RegisterScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [referral, setReferral] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<PlatformStatus | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  // Bumped on captcha failure to remount the widget for a fresh challenge.
  const [captchaKey, setCaptchaKey] = useState(0);
  const captchaEnabled = !!apiConfig.turnstileSiteKey;

  useEffect(() => {
    // Best-effort gate: if allow_new_registrations is off, hide the form
    // entirely so the user isn't filling out fields the gateway will reject.
    authApi
      .platformStatus()
      .then(setAllowed)
      .catch(() => {
        /* swallow — UX falls through to the form */
      });
  }, []);

  // Token arriving from the widget. Clear the "complete the captcha" hint the
  // moment a token lands so the user never sees "Success!" next to that error.
  const handleToken = (t: string) => {
    setTurnstileToken(t);
    if (t) setError((prev) => (prev && /captcha|complete the captcha/i.test(prev) ? null : prev));
  };

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || password.length < 8 || !firstName.trim() || !lastName.trim()) {
      setError('Email, name, and an 8+ character password are required.');
      return;
    }
    if (captchaEnabled && !turnstileToken) {
      setError('Please complete the captcha below before continuing.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authApi.register({
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        referral_code: referral.trim() || undefined,
        cf_turnstile_token: turnstileToken || undefined,
      });
      setSent(res.email);
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError || e instanceof ApiNetworkError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not register.';
      setError(msg);
      // Turnstile tokens are SINGLE-USE: the failed attempt already consumed
      // this token (even when the failure was e.g. "email already registered").
      // Re-submitting with the same token makes Cloudflare report a duplicate,
      // which surfaces as a misleading "CAPTCHA verification failed". So after
      // ANY failure, drop the token and remount the widget for a fresh one.
      if (captchaEnabled) {
        setTurnstileToken('');
        setCaptchaKey((n) => n + 1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (!sent) return;
    setError(null);
    try {
      await authApi.resendVerification(sent);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not resend.');
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }}>
        <View style={{ paddingHorizontal: theme.spacing[5], paddingTop: theme.spacing[10], gap: theme.spacing[3] }}>
          <Text variant="h1">Check your inbox</Text>
          <Text variant="bodyMd" tone="secondary">
            We sent a verification link to{' '}
            <Text variant="bodyMd" weight="medium">{sent}</Text>. Click it to
            finish setting up your account.
          </Text>
          <View style={{ height: theme.spacing[3] }} />
          <Button variant="secondary" onPress={onResend}>Resend link</Button>
          <Button
            variant="ghost"
            onPress={() => router.replace('/(auth)/login')}
          >
            Back to sign in
          </Button>
          {error ? <Text variant="body" tone="sell">{error}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing[5],
            paddingTop: theme.spacing[10],
            paddingBottom: theme.spacing[8],
            gap: theme.spacing[4],
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <Text variant="h1">Create account</Text>
            <View style={{ height: theme.spacing[1] }} />
            <Text variant="bodyMd" tone="secondary">Trade forex, metals, indices, and crypto CFDs.</Text>
          </View>

          {allowed && !allowed.allow_new_registrations ? (
            <View
              style={{
                padding: theme.spacing[3],
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.bg.secondary,
                borderWidth: 1,
                borderColor: theme.colors.warning,
              }}
            >
              <Text variant="label" tone="warning">Registrations paused</Text>
              <View style={{ height: theme.spacing[1] }} />
              <Text variant="bodyMd" tone="secondary">
                New sign-ups are temporarily disabled by the broker. Please
                check back later.
              </Text>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="First name"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoComplete="name-given"
                    returnKeyType="next"
                    editable={!submitting}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Last name"
                    value={lastName}
                    onChangeText={setLastName}
                    autoComplete="name-family"
                    returnKeyType="next"
                    editable={!submitting}
                  />
                </View>
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
                placeholder="At least 8 characters"
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="next"
                editable={!submitting}
              />

              <Field
                label="Referral code"
                hint="Optional — apply your IB's code at sign-up."
                value={referral}
                onChangeText={setReferral}
                autoCapitalize="characters"
                returnKeyType="go"
                onSubmitEditing={() => void onSubmit()}
                editable={!submitting}
              />

              {captchaEnabled ? (
                <View>
                  <Text variant="label" tone="secondary">Verification</Text>
                  <View style={{ height: theme.spacing[1] }} />
                  <TurnstileWidget key={captchaKey} onToken={handleToken} />
                </View>
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
                Create account
              </Button>
            </>
          )}

          <Link href="/(auth)/login" replace>
            <Text variant="bodyMd" tone="accent" align="center">
              Already have an account? Sign in
            </Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
