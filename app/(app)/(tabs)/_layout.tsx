import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TrendingUp, ArrowLeftRight, Briefcase, Wallet as WalletIcon, Menu,
} from 'lucide-react-native';
import { useTheme } from '@/theme';

/** Floating pill bottom tab bar — Vantage's signature.
 *  Rounded pill ~16px from screen edges, hovers above safe area.
 *  Active tab gets accent-green icon + label; inactive stays grey. */
function TabIcon({
  Icon, focused, color,
}: {
  Icon: typeof TrendingUp;
  focused: boolean;
  color: string;
}) {
  return <Icon size={22} color={color} strokeWidth={focused ? 2.5 : 1.75} />;
}

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pillHeight = 64;
  const bottomMargin = Math.max(insets.bottom, 12);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
          borderColor: theme.colors.border.primary,
          paddingHorizontal: 8,
          elevation: 12,
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        },
        tabBarBackground: () => <View style={{ flex: 1, backgroundColor: 'transparent' }} />,
      }}
    >
      <Tabs.Screen
        name="markets"
        options={{
          title: 'Markets',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={TrendingUp} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trade"
        options={{
          title: 'Trade',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={ArrowLeftRight} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Briefcase} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={WalletIcon} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Menu} focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}
