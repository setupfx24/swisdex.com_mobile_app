import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { Text, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { TradingViewChart } from '@/charts/TradingViewChart';
import { useMarketDataStore } from '@/stores/marketDataStore';

/** Full-screen TradingView chart — opened from the trade screen's expand
 *  button. Renders the same widget edge-to-edge with all indicators /
 *  drawing tools / timeframes, plus a close button. */
export default function ChartScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ symbol?: string }>();
  const selected = useMarketDataStore((s) => s.selectedSymbol);
  const symbol = String(params.symbol || selected || 'XAUUSD');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2],
          paddingHorizontal: theme.spacing[2], paddingVertical: theme.spacing[2],
        }}
      >
        <Pressable
          haptic="light"
          onPress={() => router.back()}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={24} color={theme.colors.text.primary} strokeWidth={2} />
        </Pressable>
        <Text variant="bodyLg" weight="bold">{symbol}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <TradingViewChart symbol={symbol} />
      </View>
    </SafeAreaView>
  );
}
