import { View } from 'react-native';
import { router } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { Text, Num, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { useAccountsStore } from '@/stores/accountsStore';

interface Props {
  variant?: 'full' | 'compact';
}

/** Always-visible account + balance pill for the top of trading screens.
 *  Tap to push the accounts list (where the user can switch active or
 *  open a new account). CLAUDE.md: "Top bar: minimal — account switcher
 *  + balance ALWAYS visible." */
export function ActiveAccountBadge({ variant = 'full' }: Props) {
  const theme = useTheme();
  const active = useAccountsStore((s) => s.active);

  if (!active) {
    return (
      <Pressable
        onPress={() => router.push('/accounts')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: theme.spacing[1],
          paddingHorizontal: theme.spacing[3],
          borderRadius: theme.radius.lg,
          backgroundColor: pressed ? theme.colors.bg.active : theme.colors.bg.secondary,
          borderWidth: 1,
          borderColor: theme.colors.border.primary,
          gap: theme.spacing[2],
        })}
      >
        <Text variant="bodyMd" weight="medium">Open an account</Text>
        <ChevronDown size={14} color={theme.colors.text.secondary} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push('/accounts')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing[1],
        paddingHorizontal: theme.spacing[3],
        borderRadius: theme.radius.lg,
        backgroundColor: pressed ? theme.colors.bg.active : theme.colors.bg.secondary,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
        gap: theme.spacing[2],
      })}
    >
      <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1] }}>
          <Text variant="labelXs" tone="tertiary">
            #{active.account_number} {active.is_demo ? '· demo' : ''}
          </Text>
        </View>
        {variant === 'full' ? (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[1] }}>
            <Num value={active.equity} digits={2} variant="num" />
            <Text variant="body" tone="tertiary">{active.currency}</Text>
          </View>
        ) : null}
      </View>
      <ChevronDown size={14} color={theme.colors.text.secondary} />
    </Pressable>
  );
}
