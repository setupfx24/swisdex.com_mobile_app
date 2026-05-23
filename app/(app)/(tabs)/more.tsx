import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  User as UserIcon,
  Lock,
  ShieldCheck,
  Smartphone,
  LayoutGrid,
  LogOut,
  ChevronRight,
  Bell,
  LifeBuoy,
} from 'lucide-react-native';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { Text, Divider, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';

interface RowProps {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onPress: () => void;
  destructive?: boolean;
}

function Row({ icon, label, hint, onPress, destructive }: RowProps) {
  const theme = useTheme();
  const fg = destructive ? theme.colors.sell : theme.colors.text.primary;
  return (
    <Pressable
      onPress={onPress}
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
          width: 32,
          height: 32,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.bg.secondary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMd" style={{ color: fg }}>{label}</Text>
        {hint ? (
          <Text variant="body" tone="tertiary" style={{ marginTop: 2 }}>{hint}</Text>
        ) : null}
      </View>
      {!destructive ? <ChevronRight size={16} color={theme.colors.text.tertiary} /> : null}
    </Pressable>
  );
}

export default function MoreTab() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const unread = useNotificationsStore((s) => s.unread);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[2], paddingBottom: theme.spacing[3] }}>
        <Text variant="h2">More</Text>
        {user ? (
          <>
            <View style={{ height: theme.spacing[1] }} />
            <Text variant="bodyMd" tone="secondary">{user.email}</Text>
          </>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[12] }}>
        <Divider />

        <Row
          icon={<Bell size={18} color={theme.colors.text.primary} strokeWidth={1.75} />}
          label="Inbox"
          hint={unread > 0 ? `${unread} unread` : undefined}
          onPress={() => router.push('/inbox')}
        />
        <Divider inset={theme.spacing[4]} />

        <Row
          icon={<LifeBuoy size={18} color={theme.colors.text.primary} strokeWidth={1.75} />}
          label="Support"
          onPress={() => router.push('/support')}
        />
        <Divider inset={theme.spacing[4]} />

        <Row
          icon={<LayoutGrid size={18} color={theme.colors.text.primary} strokeWidth={1.75} />}
          label="Trading accounts"
          hint="View, switch, open new"
          onPress={() => router.push('/accounts')}
        />
        <Divider inset={theme.spacing[4]} />

        <Row
          icon={<UserIcon size={18} color={theme.colors.text.primary} strokeWidth={1.75} />}
          label="Profile"
          onPress={() => router.push('/profile')}
        />
        <Divider inset={theme.spacing[4]} />

        <Row
          icon={<ShieldCheck size={18} color={theme.colors.text.primary} strokeWidth={1.75} />}
          label="KYC"
          hint={user?.kyc_status ? `Status: ${user.kyc_status}` : undefined}
          onPress={() => router.push('/kyc')}
        />
        <Divider inset={theme.spacing[4]} />

        <Row
          icon={<Lock size={18} color={theme.colors.text.primary} strokeWidth={1.75} />}
          label="Change password"
          onPress={() => router.push('/profile-password')}
        />
        <Divider inset={theme.spacing[4]} />

        <Row
          icon={<Smartphone size={18} color={theme.colors.text.primary} strokeWidth={1.75} />}
          label="Active sessions"
          onPress={() => router.push('/sessions')}
        />
        <Divider />

        <View style={{ height: theme.spacing[6] }} />

        <Row
          icon={<LogOut size={18} color={theme.colors.sell} strokeWidth={1.75} />}
          label="Sign out"
          destructive
          onPress={() => { void signOut(); }}
        />
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
}
