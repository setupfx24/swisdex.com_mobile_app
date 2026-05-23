import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Num, Divider, Pressable, Skeleton } from '@/ui';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';

/** Phase-3 placeholder home screen. Renders one of three states based on
 *  the bootstrap result so we can prove the auth pipeline end-to-end before
 *  building real login UI in Phase 4. */
export default function Index() {
  const theme = useTheme();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const networkError = useAuthStore((s) => s.networkError);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }}>
      <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[8] }}>
        <Text variant="h1">SwisDex</Text>
        <Text variant="bodyMd" tone="secondary" style={{ marginTop: theme.spacing[1] }}>
          Phase 3 — API client + auth bootstrap
        </Text>

        <View style={{ height: theme.spacing[6] }} />
        <Divider />
        <View style={{ height: theme.spacing[4] }} />

        {status === 'loading' && (
          <View style={{ gap: theme.spacing[2] }}>
            <Skeleton width="40%" height={14} />
            <Skeleton width="65%" height={14} />
          </View>
        )}

        {status === 'unauthenticated' && (
          <View>
            <Text variant="label" tone="tertiary">Status</Text>
            <View style={{ height: theme.spacing[1] }} />
            <Text variant="bodyMd" tone="secondary">
              Not signed in. Phase 4 adds the login screen — for now this
              proves the bootstrap correctly read SecureStore.
            </Text>
            {networkError ? (
              <>
                <View style={{ height: theme.spacing[3] }} />
                <View
                  style={{
                    padding: theme.spacing[3],
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.sellBg,
                    borderWidth: 1,
                    borderColor: theme.colors.sell,
                  }}
                >
                  <Text variant="label" tone="sell">Gateway unreachable</Text>
                  <View style={{ height: theme.spacing[1] }} />
                  <Text variant="bodyMd" tone="secondary">{networkError}</Text>
                </View>
              </>
            ) : null}
          </View>
        )}

        {status === 'authenticated' && user ? (
          <View>
            <Text variant="label" tone="tertiary">Signed in</Text>
            <View style={{ height: theme.spacing[1] }} />
            <Text variant="bodyLg">{user.email}</Text>
            <View style={{ height: theme.spacing[1] }} />
            <Text variant="body" tone="secondary">
              role: {user.role} · kyc: {user.kyc_status} · 2fa: {user.two_factor_enabled ? 'on' : 'off'}
            </Text>

            <View style={{ height: theme.spacing[4] }} />
            <Pressable
              haptic="medium"
              onPress={() => {
                void signOut();
              }}
              style={({ pressed }) => ({
                paddingVertical: theme.spacing[3],
                paddingHorizontal: theme.spacing[4],
                borderRadius: theme.radius.md,
                backgroundColor: pressed ? theme.colors.bg.active : theme.colors.bg.secondary,
                borderWidth: 1,
                borderColor: theme.colors.border.primary,
                alignSelf: 'flex-start',
              })}
            >
              <Text variant="bodyMd" weight="medium">Sign out</Text>
            </Pressable>

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
        ) : null}
      </View>
    </SafeAreaView>
  );
}
