import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/ui';
import { useTheme } from '@/theme';
import { ActiveAccountBadge } from '@/features/accounts/ActiveAccountBadge';
import { ProfileCompleteGate } from '@/features/auth/ProfileCompleteGate';

export default function MarketsTab() {
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <ProfileCompleteGate />
      <View
        style={{
          paddingHorizontal: theme.spacing[4],
          paddingTop: theme.spacing[2],
          paddingBottom: theme.spacing[2],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text variant="h2">Markets</Text>
        <ActiveAccountBadge />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="bodyMd" tone="tertiary">Watchlist + instruments arrive in Phase 6.</Text>
      </View>
    </SafeAreaView>
  );
}
