import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  User as UserIcon, LayoutGrid, Plus, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft,
  History, FileText, Download, Users, PiggyBank, CalendarClock, ShieldCheck,
  Sparkles, Share2, Gift, BadgeCheck, KeyRound, Smartphone, Bell, Languages, Moon,
  HelpCircle, MessageCircle, LogOut, ChevronRight, Award,
} from 'lucide-react-native';
import { Text, Divider, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationsStore } from '@/stores/notificationsStore';

interface Row { icon: React.ReactNode; label: string; hint?: string; onPress: () => void; danger?: boolean }
interface Section { title: string; items: Row[] }

/** Vantage-style More tab — profile header + grouped sections w/ dividers. */
export default function MoreTab() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const unread = useNotificationsStore((s) => s.unread);

  const icon = (Component: typeof UserIcon, color?: string) => (
    <Component size={20} color={color ?? theme.colors.text.primary} strokeWidth={1.75} />
  );

  const sections: Section[] = [
    {
      title: 'Account',
      items: [
        { icon: icon(LayoutGrid), label: 'My accounts', hint: 'View, switch, open new', onPress: () => router.push('/accounts') },
        { icon: icon(Plus), label: 'Open new account', onPress: () => router.push('/accounts/open') },
      ],
    },
    {
      title: 'Funds',
      items: [
        { icon: icon(ArrowDownToLine, theme.colors.buy), label: 'Deposit', onPress: () => router.push('/wallet/deposit') },
        { icon: icon(ArrowUpFromLine, theme.colors.sell), label: 'Withdraw', onPress: () => router.push('/wallet/withdraw') },
        { icon: icon(ArrowRightLeft), label: 'Transfer', onPress: () => router.push('/wallet/transfer') },
      ],
    },
    {
      title: 'Trading',
      items: [
        { icon: icon(History), label: 'Trade history', onPress: () => router.push('/portfolio-history') },
        { icon: icon(FileText), label: 'Statement / Reports', onPress: () => router.push('/portfolio-history') },
        { icon: icon(Download), label: 'Export data', onPress: () => router.push('/portfolio-export') },
      ],
    },
    {
      title: 'Earn',
      items: [
        { icon: icon(Users), label: 'Copy trading', onPress: () => router.push('/earn/copy') },
        { icon: icon(PiggyBank), label: 'Staking', onPress: () => router.push('/earn/staking') },
        { icon: icon(CalendarClock), label: 'Fixed return', onPress: () => router.push('/earn/fixed-return') },
        { icon: icon(ShieldCheck), label: 'Trade insurance', onPress: () => router.push('/earn/insurance') },
      ],
    },
    {
      title: 'Rewards',
      items: [
        { icon: icon(Sparkles, theme.colors.buy), label: 'Rewards & XP', onPress: () => router.push('/earn/rewards') },
        { icon: icon(Share2), label: 'Refer & earn', onPress: () => router.push('/earn/referral') },
        { icon: icon(Gift), label: 'Promotions', onPress: () => router.push('/earn') },
      ],
    },
    {
      title: 'Account & Security',
      items: [
        { icon: icon(BadgeCheck), label: 'KYC / Verification', hint: user?.kyc_status ? `Status: ${user.kyc_status}` : undefined, onPress: () => router.push('/kyc') },
        { icon: icon(KeyRound), label: 'Two-factor auth', hint: user?.two_factor_enabled ? 'Enabled' : 'Disabled', onPress: () => router.push('/profile') },
        { icon: icon(Award), label: 'Change password', onPress: () => router.push('/profile-password') },
        { icon: icon(Smartphone), label: 'Active sessions', onPress: () => router.push('/sessions') },
      ],
    },
    {
      title: 'Inbox & Settings',
      items: [
        { icon: icon(Bell), label: 'Inbox', hint: unread > 0 ? `${unread} unread` : undefined, onPress: () => router.push('/inbox') },
        { icon: icon(Languages), label: 'Language', hint: user?.language ?? 'en', onPress: () => router.push('/profile') },
        { icon: icon(Moon), label: 'Theme', hint: 'Dark', onPress: () => {} },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: icon(HelpCircle), label: 'Help center', onPress: () => router.push('/support') },
        { icon: icon(MessageCircle), label: 'Contact support', onPress: () => router.push('/support/new') },
      ],
    },
    {
      title: '',
      items: [
        { icon: icon(LogOut, theme.colors.sell), label: 'Sign out', danger: true, onPress: () => { void signOut(); } },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
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
                    {item.icon}
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyLg" style={item.danger ? { color: theme.colors.sell } : undefined}>
                        {item.label}
                      </Text>
                      {item.hint ? (
                        <Text variant="bodyMd" tone="secondary">{item.hint}</Text>
                      ) : null}
                    </View>
                    {!item.danger ? <ChevronRight size={16} color={theme.colors.text.tertiary} /> : null}
                  </Pressable>
                  {idx < section.items.length - 1 ? <Divider inset={theme.spacing[4] + 20 + theme.spacing[3]} /> : null}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
