import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { AnimatedTabIcon } from '@/features/nav/AnimatedTabIcon';

// Lottie sources per tab (authored green; retinted at runtime to follow the
// theme — accent-green when focused, grey when not).
const ICONS = {
  markets: require('../../../assets/lottie/markets.json'),
  trade: require('../../../assets/lottie/trade.json'),
  portfolio: require('../../../assets/lottie/portfolio.json'),
  wallet: require('../../../assets/lottie/wallet.json'),
  more: require('../../../assets/lottie/more.json'),
} as const;

/** Floating pill bottom tab bar — Vantage's signature.
 *  Rounded pill ~16px from screen edges, hovers above safe area.
 *  Each tab uses an animated Lottie glyph that plays on focus; active tab
 *  is accent-green, inactive stays grey. */
export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pillHeight = 64;
  const bottomMargin = Math.max(insets.bottom, 12);

  const icon = (source: object) =>
    ({ focused }: { focused: boolean }) => (
      <AnimatedTabIcon
        source={source}
        focused={focused}
        activeColor={theme.colors.buy}
        inactiveColor={theme.colors.text.secondary}
        size={28}
      />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Freeze (stop re-rendering) any tab that isn't focused. Every tab
        // subscribes to the price socket, so without this a blurred Trade /
        // Markets screen keeps re-rendering its rows on every tick while the
        // user sits on another tab — wasted work that competes with the
        // foreground screen for the JS thread.
        freezeOnBlur: true,
        lazy: true,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.buy,
        tabBarInactiveTintColor: theme.colors.text.secondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
          borderRadius: theme.radius.pill,
          marginHorizontal: 2,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: bottomMargin,
          height: pillHeight,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.bg.secondary,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: theme.colors.bg.glassBorder,
          paddingHorizontal: 8,
          elevation: 12,
          shadowColor: theme.scheme === 'dark' ? theme.colors.buy : '#000',
          shadowOpacity: theme.scheme === 'dark' ? 0.3 : 0.18,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        },
        tabBarBackground: () => (
          theme.scheme === 'dark' ? (
            <View style={{ flex: 1, borderRadius: theme.radius.pill, overflow: 'hidden' }}>
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.bg.glass }]} />
            </View>
          ) : (
            <View style={{ flex: 1, borderRadius: theme.radius.pill, backgroundColor: theme.colors.bg.primary }} />
          )
        ),
      }}
    >
      <Tabs.Screen name="markets" options={{ title: 'Markets', tabBarIcon: icon(ICONS.markets) }} />
      <Tabs.Screen name="trade" options={{ title: 'Trade', tabBarIcon: icon(ICONS.trade) }} />
      <Tabs.Screen name="portfolio" options={{ title: 'Portfolio', tabBarIcon: icon(ICONS.portfolio) }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet', tabBarIcon: icon(ICONS.wallet) }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon(ICONS.more) }} />
    </Tabs>
  );
}
