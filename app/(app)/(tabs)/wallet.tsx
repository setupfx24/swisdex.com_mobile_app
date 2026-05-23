import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/ui';
import { useTheme } from '@/theme';

export default function WalletTab() {
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[2] }}>
        <Text variant="h2">Wallet</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="bodyMd" tone="tertiary">Deposits + withdrawals + transfers arrive in Phase 10.</Text>
      </View>
    </SafeAreaView>
  );
}
