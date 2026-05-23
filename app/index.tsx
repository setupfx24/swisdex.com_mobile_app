import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Num, Divider } from '@/ui';
import { useTheme } from '@/theme';

/** Placeholder home screen — Phase 2 deliverable. Phase 3 replaces this with
 *  the auth bootstrap (load tokens from SecureStore → call /auth/me →
 *  redirect to /auth/login or /(tabs)/markets). */
export default function Index() {
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }}>
      <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[8] }}>
        <Text variant="h1">SwisDex</Text>
        <Text variant="bodyMd" tone="secondary" style={{ marginTop: theme.spacing[1] }}>
          Mobile scaffold ready — Phase 2 complete
        </Text>

        <View style={{ height: theme.spacing[8] }} />

        {/* Quick visual proof that the design system reads correctly. */}
        <Text variant="label" tone="tertiary">Live preview</Text>
        <View style={{ height: theme.spacing[2] }} />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[3] }}>
          <Text variant="bodyLg">XAUUSD</Text>
          <Num value={2_345.678} digits={3} variant="numXl" />
          <Num value={0.42} digits={2} pnl signed suffix="%" />
        </View>

        <View style={{ height: theme.spacing[4] }} />
        <Divider />
        <View style={{ height: theme.spacing[4] }} />

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[3] }}>
          <Text variant="bodyLg">BTCUSD</Text>
          <Num value={68_420.5} digits={1} variant="numXl" />
          <Num value={-1.18} digits={2} pnl signed suffix="%" />
        </View>
      </View>
    </SafeAreaView>
  );
}
