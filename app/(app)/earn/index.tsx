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
  ShoppingBag,
  Trophy,
  Gamepad2,
  Layers,
  ChevronRight,
} from 'lucide-react-native';
import { Text, Divider, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { ProfileHeader } from '../profile';

type IconKey = 'sparkles' | 'piggy' | 'calendar' | 'shield' | 'users' | 'award' | 'store' | 'trophy' | 'play' | 'pamm';

const ROWS: { key: string; label: string; hint: string; icon: IconKey; path: string }[] = [
  { key: 'referral',  label: 'Referral',      hint: 'Refer friends, earn commission',  icon: 'award',    path: '/earn/referral' },
  { key: 'fixedret',  label: 'Fixed Return',  hint: 'Tenure-based interest',           icon: 'calendar', path: '/earn/fixed-return' },
];

export default function EarnHubScreen() {
  const theme = useTheme();

  const iconFor = (key: IconKey) => {
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
      case 'store':    return <ShoppingBag size={size} color={color} strokeWidth={strokeWidth} />;
      case 'trophy':   return <Trophy size={size} color={color} strokeWidth={strokeWidth} />;
      case 'play':     return <Gamepad2 size={size} color={color} strokeWidth={strokeWidth} />;
      case 'pamm':     return <Layers size={size} color={color} strokeWidth={strokeWidth} />;
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
              onPress={() => router.push(r.path as never)}
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
