import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Num, Divider, Button } from '@/ui';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { ProfileCompleteGate } from '@/features/auth/ProfileCompleteGate';

/** Phase-4 authenticated home placeholder. Phase 5 replaces this with the
 *  proper bottom-tab structure (Markets / Trade / Portfolio / Wallet / More). */
export default function AppHome() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }}>
      <ProfileCompleteGate />
      <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[8] }}>
        <Text variant="h1">SwisDex</Text>
        <Text variant="bodyMd" tone="secondary" style={{ marginTop: theme.spacing[1] }}>
          Phase 4 — auth flows complete
        </Text>

        <View style={{ height: theme.spacing[6] }} />
        <Divider />
        <View style={{ height: theme.spacing[4] }} />

        <Text variant="label" tone="tertiary">Signed in</Text>
        <View style={{ height: theme.spacing[1] }} />
        <Text variant="bodyLg">{user?.email ?? '—'}</Text>
        <View style={{ height: theme.spacing[1] }} />
        <Text variant="body" tone="secondary">
          role: {user?.role ?? '—'} · kyc: {user?.kyc_status ?? '—'} · 2fa:{' '}
          {user?.two_factor_enabled ? 'on' : 'off'} · profile_complete:{' '}
          {user?.profile_complete ? 'yes' : 'no'}
        </Text>

        <View style={{ height: theme.spacing[6] }} />
        <Button variant="secondary" fullWidth={false} onPress={() => { void signOut(); }}>
          Sign out
        </Button>

        <View style={{ height: theme.spacing[6] }} />
        <Divider />
        <View style={{ height: theme.spacing[4] }} />

        <Text variant="label" tone="tertiary">Live preview</Text>
        <View style={{ height: theme.spacing[2] }} />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[3] }}>
          <Text variant="bodyLg">XAUUSD</Text>
          <Num value={2_345.678} digits={3} variant="numXl" />
          <Num value={0.42} digits={2} pnl signed suffix="%" />
        </View>
      </View>
    </SafeAreaView>
  );
}
