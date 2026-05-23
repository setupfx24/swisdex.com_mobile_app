import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import {
  Sparkles,
  PiggyBank,
  CalendarClock,
  ShieldCheck,
  Users,
  Award,
  ChevronRight,
} from 'lucide-react-native';
import { Text, Divider, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { ProfileHeader } from '../profile';

const ROWS: { key: string; label: string; hint: string; icon: 'sparkles' | 'piggy' | 'calendar' | 'shield' | 'users' | 'award'; path: string }[] = [
  { key: 'rewards',   label: 'Rewards',       hint: 'XP, Artha Coins, daily missions', icon: 'sparkles', path: '/earn/rewards' },
  { key: 'staking',   label: 'Staking',       hint: 'Lock funds, earn APY',            icon: 'piggy',    path: '/earn/staking' },
  { key: 'fixedret',  label: 'Fixed return',  hint: 'Tenure-based interest',           icon: 'calendar', path: '/earn/fixed-return' },
  { key: 'insurance', label: 'Trade insurance', hint: 'Cap your downside',             icon: 'shield',   path: '/earn/insurance' },
  { key: 'copy',      label: 'Copy trading',   hint: 'Follow top traders',              icon: 'users',    path: '/earn/copy' },
  { key: 'referral',  label: 'Referral / IB',  hint: 'Refer friends, earn commission',  icon: 'award',    path: '/earn/referral' },
];

export default function EarnHubScreen() {
  const theme = useTheme();

  const iconFor = (key: typeof ROWS[number]['icon']) => {
    const size = 18;
    const color = theme.colors.text.primary;
    const strokeWidth = 1.75;
    switch (key) {
      case 'sparkles': return <Sparkles size={size} color={color} strokeWidth={strokeWidth} />;
      case 'piggy':    return <PiggyBank size={size} color={color} strokeWidth={strokeWidth} />;
      case 'calendar': return <CalendarClock size={size} color={color} strokeWidth={strokeWidth} />;
      case 'shield':   return <ShieldCheck size={size} color={color} strokeWidth={strokeWidth} />;
      case 'users':    return <Users size={size} color={color} strokeWidth={strokeWidth} />;
      case 'award':    return <Award size={size} color={color} strokeWidth={strokeWidth} />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Earn' }} />
      <ProfileHeader title="Earn" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[8] }}>
        <Divider />
        {ROWS.map((r, i) => (
          <View key={r.key}>
            <Pressable
              onPress={() => router.push(r.path)}
              haptic="light"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: theme.spacing[4],
                paddingVertical: theme.spacing[3],
                backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
                gap: theme.spacing[3],
              })}
            >
              <View
                style={{
                  width: 32, height: 32,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.bg.secondary,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {iconFor(r.icon)}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMd" weight="medium">{r.label}</Text>
                <Text variant="body" tone="tertiary">{r.hint}</Text>
              </View>
              <ChevronRight size={16} color={theme.colors.text.tertiary} />
            </Pressable>
            {i < ROWS.length - 1 ? <Divider inset={theme.spacing[4]} /> : <Divider />}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
