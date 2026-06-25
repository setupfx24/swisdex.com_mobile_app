import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  User as UserIcon, LayoutGrid, Plus, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft,
  History, FileText, Download, CalendarClock, ShieldCheck,
  Share2, Bell, Languages, Moon,
  HelpCircle, MessageCircle, LogOut, ChevronRight, Calculator, Briefcase,
  PieChart, GraduationCap, Newspaper, Network, TrendingUp, Scale,
} from 'lucide-react-native';
import { Text, Divider, Pressable, GradientBackground } from '@/ui';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { useI18nStore } from '@/stores/i18nStore';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { useThemeStore, type ThemeMode } from '@/stores/themeStore';

const THEME_LABEL: Record<ThemeMode, string> = { light: 'Light', dark: 'Dark' };
const THEME_NEXT: Record<ThemeMode, ThemeMode> = { dark: 'light', light: 'dark' };
// Sign-out stays red (destructive action) even though the theme is green.
const DANGER_RED = '#FF2D55';

type IconType = typeof UserIcon;
interface Row { Icon: IconType; label: string; hint?: string; onPress: () => void; danger?: boolean }
interface Section { title: string; items: Row[] }

/** More tab — mirrors the swisdex.com web sidebar: dark surface, plain
 *  green line icons (no tinted circles), white labels. Sign out is red. */
export default function MoreTab() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const unread = useNotificationsStore((s) => s.unread);
  const lang = useI18nStore((s) => s.lang);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);

  const sections: Section[] = [
    {
      title: 'Account',
      items: [
        { Icon: LayoutGrid, label: 'My accounts', hint: 'View, switch, open new', onPress: () => router.push('/accounts') },
        { Icon: Plus, label: 'Open new account', onPress: () => router.push('/accounts/open') },
      ],
    },
    {
      title: 'Funds',
      items: [
        { Icon: ArrowDownToLine, label: 'Deposit', onPress: () => router.push('/wallet/deposit') },
        { Icon: ArrowUpFromLine, label: 'Withdraw', onPress: () => router.push('/wallet/withdraw') },
        { Icon: ArrowRightLeft, label: 'Transfer', onPress: () => router.push('/wallet/transfer') },
        { Icon: History, label: 'Transactions', onPress: () => router.push('/wallet/transactions') },
      ],
    },
    {
      title: 'Discover',
      items: [
        { Icon: PieChart, label: 'Portfolio', onPress: () => router.push('/portfolio') },
        { Icon: Newspaper, label: 'Economic News', onPress: () => router.push('/news') },
        { Icon: GraduationCap, label: 'SwisDex Academy', onPress: () => router.push('/academy' as never) },
      ],
    },
    {
      title: 'Trading',
      items: [
        { Icon: History, label: 'Trade history', onPress: () => router.push('/portfolio-history') },
        { Icon: FileText, label: 'Statement / Reports', onPress: () => router.push('/statement') },
        { Icon: Calculator, label: 'Risk calculator', onPress: () => router.push('/risk-calculator') },
        { Icon: Download, label: 'Export data', onPress: () => router.push('/portfolio-export') },
      ],
    },
    {
      title: 'Earn',
      items: [
        { Icon: Share2, label: 'Referral', onPress: () => router.push('/earn/referral') },
        { Icon: CalendarClock, label: 'Fixed Return', onPress: () => router.push('/earn/fixed-return') },
      ],
    },
    {
      title: 'Managed & Partners',
      items: [
        { Icon: ShieldCheck, label: 'Trade Insurance', onPress: () => router.push('/earn/insurance') },
        { Icon: TrendingUp, label: 'PAMM', hint: 'Pooled managed accounts', onPress: () => router.push('/earn/pamm') },
        { Icon: Network, label: 'MAMM', hint: 'Multi-account manager', onPress: () => router.push('/social') },
        { Icon: Briefcase, label: 'Affiliates', hint: 'Introducing broker dashboard', onPress: () => router.push('/business') },
      ],
    },
    {
      title: 'Inbox & Settings',
      items: [
        { Icon: Bell, label: 'Inbox', hint: unread > 0 ? `${unread} unread` : undefined, onPress: () => router.push('/inbox') },
        { Icon: Languages, label: 'Language', hint: lang.toUpperCase(), onPress: () => router.push('/settings/language') },
        { Icon: Moon, label: 'Theme', hint: THEME_LABEL[themeMode], onPress: () => { void setThemeMode(THEME_NEXT[themeMode]); } },
      ],
    },
    {
      title: 'Support',
      items: [
        { Icon: HelpCircle, label: 'Get Support', onPress: () => router.push('/support') },
        { Icon: MessageCircle, label: 'Contact support', onPress: () => router.push('/support/new') },
        { Icon: Scale, label: 'Terms & Conditions', onPress: () => router.push('/terms' as never) },
      ],
    },
    {
      title: '',
      items: [
        { Icon: LogOut, label: 'Sign out', danger: true, onPress: () => { void signOut(); } },
      ],
    },
  ];

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.hitTargets.tabBarBottom + theme.spacing[6] }}>
        {/* Profile card */}
        <Pressable
          haptic="light"
          onPress={() => router.push('/profile')}
          style={({ pressed }) => ({
            margin: theme.spacing[4],
            padding: theme.spacing[4],
            borderRadius: theme.radius.lg,
            backgroundColor: pressed ? theme.colors.bg.tertiary : theme.colors.bg.secondary,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing[3],
          })}
        >
          <View
            style={{
              width: 56, height: 56,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.bg.chip,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text variant="h2">
              {(user?.first_name?.[0] ?? user?.email?.[0] ?? 'S').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyLg" weight="bold">
              {user?.first_name || user?.last_name
                ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
                : 'SwisDex Trader'}
            </Text>
            <Text variant="bodyMd" tone="secondary" numberOfLines={1}>{user?.email}</Text>
          </View>
          <ChevronRight size={16} color={theme.colors.text.tertiary} />
        </Pressable>

        {sections.map((section, i) => (
          <View key={section.title || `sec-${i}`}>
            {section.title ? (
              <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[5], paddingBottom: theme.spacing[2] }}>
                <Text variant="labelXs" tone="tertiary">{section.title.toUpperCase()}</Text>
              </View>
            ) : (
              <View style={{ height: theme.spacing[5] }} />
            )}
            <View
              style={{
                marginHorizontal: theme.spacing[4],
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.bg.secondary,
                overflow: 'hidden',
              }}
            >
              {section.items.map((item, idx) => (
                <View key={item.label}>
                  <Pressable
                    haptic="light"
                    onPress={item.onPress}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: theme.spacing[4],
                      paddingVertical: theme.spacing[3],
                      backgroundColor: pressed ? theme.colors.bg.tertiary : 'transparent',
                      gap: theme.spacing[3],
                    })}
                  >
                    <item.Icon
                      size={22}
                      color={item.danger ? DANGER_RED : theme.colors.buy}
                      strokeWidth={1.85}
                    />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyLg" style={item.danger ? { color: DANGER_RED } : undefined}>
                        {item.label}
                      </Text>
                      {item.hint ? (
                        <Text variant="bodyMd" tone="secondary">{item.hint}</Text>
                      ) : null}
                    </View>
                    {!item.danger ? <ChevronRight size={16} color={theme.colors.text.tertiary} /> : null}
                  </Pressable>
                  {idx < section.items.length - 1 ? <Divider inset={theme.spacing[4] + 22 + theme.spacing[3]} /> : null}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
    </GradientBackground>
  );
}
