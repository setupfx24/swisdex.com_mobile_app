import { useState, useRef, useEffect } from 'react';
import {
  View, ScrollView, KeyboardAvoidingView, Platform, Image,
  useWindowDimensions, TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Line, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Link, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Check, TrendingUp } from 'lucide-react-native';
import { Text, Divider, Pressable } from '@/ui';
import { useTheme, type Theme } from '@/theme';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { ApiError, ApiNetworkError, apiConfig } from '@/lib/api';

const REMEMBER_KEY = 'swisdex.remember_email';

export default function LoginScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const completeAuth = useAuthStore((s) => s.completeAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [totp, setTotp] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totpRef = useRef<RNTextInput>(null);

  useEffect(() => {
    SecureStore.getItemAsync(REMEMBER_KEY).then((v) => { if (v) setEmail(v); }).catch(() => {});
  }, []);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    setSubmitting(true);
    try {
      const tokens = await authApi.login({
        email: email.trim(), password, totp_code: needsTotp ? totp.trim() : undefined,
      });
      if (remember) await SecureStore.setItemAsync(REMEMBER_KEY, email.trim()).catch(() => {});
      else await SecureStore.deleteItemAsync(REMEMBER_KEY).catch(() => {});
      await completeAuth(tokens);
      router.replace('/markets');
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (!needsTotp && /2fa|totp|code required/i.test(e.message)) {
          setNeedsTotp(true); setError(null);
          requestAnimationFrame(() => totpRef.current?.focus());
        } else if (e.status === 429) setError('Too many attempts. Wait a minute and try again.');
        else setError(e.message);
      } else if (e instanceof ApiNetworkError) setError(e.message);
      else setError(e instanceof Error ? e.message : 'Could not sign in.');
    } finally { setSubmitting(false); }
  };

  const onDemo = async () => {
    setError(null); setSubmitting(true);
    try {
      const tokens = await authApi.demoLogin();
      await completeAuth(tokens);
      router.replace('/markets');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Demo sign-in failed.');
    } finally { setSubmitting(false); }
  };

  const googleEnabled = !!apiConfig.googleClientId;
  const logo = theme.scheme === 'dark'
    ? require('../../assets/logo-light.png')
    : require('../../assets/logo-dark.png');
  const pad = theme.spacing[5];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: theme.spacing[6] }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', marginTop: theme.spacing[6], marginBottom: theme.spacing[4] }}>
            <Image source={logo} style={{ width: 172, height: 46, resizeMode: 'contain' }} />
          </View>

          <View style={{ alignItems: 'center', marginBottom: theme.spacing[4] }}>
            <Text variant="h1" weight="bold" align="center">Welcome back</Text>
            <View style={{ height: 4 }} />
            <Text variant="bodyMd" tone="secondary" align="center">Sign in to continue trading</Text>
          </View>

          {/* Mountain art — full-bleed band (SVG; swap for a photo if provided). */}
          <View style={{ marginBottom: theme.spacing[5] }}>
            <MountainArt width={width} height={150} theme={theme} />
          </View>

          <View style={{ paddingHorizontal: pad }}>
            <LoginInput
              theme={theme}
              icon={<Mail size={18} color={theme.colors.buy} strokeWidth={1.9} />}
              label="Email"
              value={email} onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none" autoComplete="email" keyboardType="email-address"
              returnKeyType="next" editable={!submitting}
            />

            <LoginInput
              theme={theme}
              icon={<Lock size={18} color={theme.colors.buy} strokeWidth={1.9} />}
              label="Password"
              value={password} onChangeText={setPassword}
              placeholder="••••••••" secureTextEntry={!showPassword}
              autoComplete="password"
              returnKeyType={needsTotp ? 'next' : 'go'}
              onSubmitEditing={() => { if (!needsTotp) void onSubmit(); }}
              editable={!submitting}
              rightSlot={
                <Pressable haptic="light" onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={{ padding: 4 }}>
                  {showPassword
                    ? <EyeOff size={20} color={theme.colors.text.secondary} strokeWidth={1.85} />
                    : <Eye size={20} color={theme.colors.text.secondary} strokeWidth={1.85} />}
                </Pressable>
              }
            />

            {needsTotp ? (
              <LoginInput
                theme={theme} inputRef={totpRef}
                icon={<Lock size={18} color={theme.colors.buy} strokeWidth={1.9} />}
                label="2FA code"
                value={totp} onChangeText={setTotp}
                placeholder="123456" keyboardType="number-pad" maxLength={6}
                autoComplete="one-time-code" returnKeyType="go"
                onSubmitEditing={() => void onSubmit()} editable={!submitting}
              />
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing[1], marginBottom: theme.spacing[4] }}>
              <Pressable haptic="light" onPress={() => setRemember((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
                <View style={{
                  width: 22, height: 22, borderRadius: theme.radius.sm, borderWidth: 1.5,
                  borderColor: remember ? theme.colors.buy : theme.colors.border.secondary,
                  backgroundColor: remember ? theme.colors.buy : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {remember ? <Check size={15} color="#FFFFFF" strokeWidth={3} /> : null}
                </View>
                <Text variant="bodyMd" tone="secondary">Remember me</Text>
              </Pressable>
              <Link href="/(auth)/forgot-password"><Text variant="bodyMd" tone="accent">Forgot password?</Text></Link>
            </View>

            {error ? (
              <View style={{ padding: theme.spacing[3], borderRadius: theme.radius.md, backgroundColor: theme.colors.sellBg, borderWidth: 1, borderColor: theme.colors.sell, marginBottom: theme.spacing[4] }}>
                <Text variant="body" tone="sell">{error}</Text>
              </View>
            ) : null}

            {/* Sign in — green pill + glow + circular arrow badge */}
            <Pressable
              haptic="medium" onPress={onSubmit} disabled={submitting}
              style={({ pressed }) => ({
                height: 56, borderRadius: theme.radius.pill,
                backgroundColor: pressed ? theme.colors.buyDark : theme.colors.buy,
                alignItems: 'center', justifyContent: 'center',
                opacity: submitting ? 0.7 : 1,
                shadowColor: theme.colors.buy, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6,
              })}
            >
              <Text variant="bodyLg" weight="bold" style={{ color: '#FFFFFF' }}>
                {submitting ? 'Please wait…' : needsTotp ? 'Verify & sign in' : 'Sign in'}
              </Text>
              {!submitting ? (
                <View style={{
                  position: 'absolute', right: 6, width: 44, height: 44, borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.4} />
                </View>
              ) : null}
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], marginVertical: theme.spacing[4] }}>
              <Divider style={{ flex: 1 }} />
              <Text variant="labelXs" tone="tertiary">OR</Text>
              <Divider style={{ flex: 1 }} />
            </View>

            <Pressable
              haptic="light"
              onPress={() => setError(
                googleEnabled
                  ? 'Google sign-in scaffold is pending the expo-auth-session wiring.'
                  : 'Google sign-in is disabled — set EXPO_PUBLIC_GOOGLE_CLIENT_ID and rebuild.',
              )}
              disabled={!googleEnabled || submitting}
              style={({ pressed }) => ({
                height: 54, borderRadius: theme.radius.lg, flexDirection: 'row',
                alignItems: 'center', justifyContent: 'center', gap: theme.spacing[3],
                backgroundColor: pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                borderWidth: 1, borderColor: theme.colors.border.primary,
                opacity: !googleEnabled ? 0.6 : 1,
              })}
            >
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5EAF0' }}>
                <Text variant="bodyMd" weight="bold" skipTranslate style={{ color: '#4285F4' }}>G</Text>
              </View>
              <Text variant="bodyLg" weight="semibold">Continue with Google</Text>
            </Pressable>

            <View style={{ alignItems: 'center', marginTop: theme.spacing[5], gap: theme.spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text variant="bodyMd" tone="secondary">Don&apos;t have an account?</Text>
                <Link href="/(auth)/register"><Text variant="bodyMd" tone="accent" weight="semibold">Create account</Text></Link>
              </View>
              <Pressable haptic="light" onPress={onDemo} disabled={submitting} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
                <TrendingUp size={18} color={theme.colors.buy} strokeWidth={2} />
                <Text variant="bodyMd" weight="semibold" tone="accent">Try a demo account</Text>
              </Pressable>
            </View>
          </View>

          {/* Candlestick footer — faded decorative chart (SVG). */}
          <View style={{ marginTop: theme.spacing[4], opacity: 0.55 }}>
            <CandleArt width={width} height={130} theme={theme} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LoginInput({
  theme, icon, label, rightSlot, inputRef, ...input
}: {
  theme: Theme; icon: React.ReactNode; label: string;
  rightSlot?: React.ReactNode; inputRef?: React.RefObject<RNTextInput | null>;
} & React.ComponentProps<typeof RNTextInput>) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3],
      backgroundColor: theme.colors.bg.secondary, borderRadius: theme.radius.lg,
      borderWidth: 1, borderColor: theme.colors.border.primary,
      paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2],
      marginBottom: theme.spacing[3], minHeight: 64,
      shadowColor: '#000', shadowOpacity: theme.scheme === 'dark' ? 0.25 : 0.06,
      shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
    }}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text variant="labelXs" tone="tertiary">{label}</Text>
        <RNTextInput
          ref={inputRef}
          placeholderTextColor={theme.colors.text.tertiary}
          selectionColor={theme.colors.buy}
          style={{ color: theme.colors.text.primary, fontSize: theme.sizes.md, paddingVertical: Platform.OS === 'ios' ? 4 : 2 }}
          {...input}
        />
      </View>
      {rightSlot}
    </View>
  );
}

/** Stylised Swiss-Alps mountain band (dark = emerald glow, light = misty day). */
function MountainArt({ width, height, theme }: { width: number; height: number; theme: Theme }) {
  const dark = theme.scheme === 'dark';
  const sky1 = dark ? '#0A1018' : '#FAFCFF';
  const sky2 = dark ? '#0C2A12' : '#EAF6EE';
  const back = dark ? '#1A2A22' : '#CBD7DE';
  const front = dark ? '#223229' : '#AEC0C9';
  const snow = dark ? '#3A4D42' : '#FFFFFF';
  const forest = dark ? '#0E2A14' : '#9CC79E';
  const glow = dark ? 'rgba(57,255,20,0.30)' : 'rgba(57,255,20,0.12)';
  return (
    <Svg width={width} height={height} viewBox="0 0 400 150">
      <Defs>
        <SvgGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={sky1} /><Stop offset="1" stopColor={sky2} />
        </SvgGradient>
        <SvgGradient id="glow" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={glow} stopOpacity="1" /><Stop offset="1" stopColor={glow} stopOpacity="0" />
        </SvgGradient>
      </Defs>
      <Rect x="0" y="0" width="400" height="150" fill="url(#sky)" />
      <Rect x="0" y="40" width="400" height="110" fill="url(#glow)" />
      <Path d="M0 150 L0 96 L70 56 L120 92 L175 48 L240 96 L300 44 L360 86 L400 60 L400 150 Z" fill={back} opacity={0.9} />
      <Path d="M0 150 L40 104 L95 70 L150 110 L210 64 L275 112 L330 72 L400 116 L400 150 Z" fill={front} />
      <Path d="M210 64 L228 82 L210 78 L196 88 L210 64 Z" fill={snow} />
      <Path d="M95 70 L110 86 L95 82 L82 92 L95 70 Z" fill={snow} />
      <Path d="M330 72 L344 88 L330 84 L318 94 L330 72 Z" fill={snow} />
      <Path d="M0 150 L0 124 Q100 108 200 126 Q300 144 400 122 L400 150 Z" fill={forest} />
    </Svg>
  );
}

/** Faded green candlestick chart + soft moving-average curve. */
function CandleArt({ width, height, theme }: { width: number; height: number; theme: Theme }) {
  const up = theme.colors.buy;
  const down = theme.colors.sell;
  const curve = theme.scheme === 'dark' ? 'rgba(57,255,20,0.55)' : 'rgba(23,192,79,0.5)';
  const bars = [
    [70, 60, 52, 78], [60, 66, 50, 74], [66, 58, 48, 72], [58, 64, 46, 70],
    [64, 50, 42, 68], [50, 56, 40, 64], [56, 44, 36, 60], [44, 50, 32, 58],
    [50, 38, 28, 56], [38, 44, 26, 50], [44, 32, 22, 48], [32, 26, 18, 44],
    [26, 34, 16, 40], [34, 22, 12, 38], [22, 16, 8, 34],
  ];
  const slot = 400 / bars.length;
  const cw = slot * 0.5;
  return (
    <Svg width={width} height={height} viewBox="0 0 400 90">
      {bars.map((b, i) => {
        const [o, c, hi, lo] = b as [number, number, number, number];
        const x = i * slot + slot / 2;
        const col = c < o ? up : down;
        const top = Math.min(o, c);
        const h = Math.max(2, Math.abs(c - o));
        return (
          <G key={i}>
            <Line x1={x} y1={hi} x2={x} y2={lo} stroke={col} strokeWidth={1} opacity={0.7} />
            <Rect x={x - cw / 2} y={top} width={cw} height={h} rx={1} fill={col} opacity={0.85} />
          </G>
        );
      })}
      <Path d="M13 70 Q60 64 100 60 T190 48 T280 30 T393 18" stroke={curve} strokeWidth={2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
