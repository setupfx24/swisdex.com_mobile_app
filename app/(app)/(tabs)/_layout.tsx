import { Tabs } from 'expo-router';
import { TrendingUp, CandlestickChart, BarChart3, Wallet, MoreHorizontal } from 'lucide-react-native';
import { useTheme } from '@/theme';

/** Five-tab bottom bar per CLAUDE.md ("max 5 items, icons WITH labels,
 *  filled active, outlined inactive"). Lucide's icon set doesn't have
 *  matching filled variants for each glyph, so we communicate active
 *  state with colour (accent green) + size + slightly thicker stroke. */
export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.buy,
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.bg.secondary,
          borderTopColor: theme.colors.border.primary,
          borderTopWidth: 1,
          height: 60 + 12, // 60pt + bottom inset breathing room
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      <Tabs.Screen
        name="markets"
        options={{
          title: 'Markets',
          tabBarIcon: ({ color, focused }) => (
            <TrendingUp size={22} color={color} strokeWidth={focused ? 2.5 : 1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="trade"
        options={{
          title: 'Trade',
          tabBarIcon: ({ color, focused }) => (
            <CandlestickChart size={22} color={color} strokeWidth={focused ? 2.5 : 1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color, focused }) => (
            <BarChart3 size={22} color={color} strokeWidth={focused ? 2.5 : 1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, focused }) => (
            <Wallet size={22} color={color} strokeWidth={focused ? 2.5 : 1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <MoreHorizontal size={22} color={color} strokeWidth={focused ? 2.5 : 1.75} />
          ),
        }}
      />
    </Tabs>
  );
}
