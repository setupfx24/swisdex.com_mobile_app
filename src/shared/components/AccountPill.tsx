import { View } from 'react-native';
import { router } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { Pressable, Text } from '@/ui';
import { useTheme } from '@/theme';
import { useAccountsStore } from '@/stores/accountsStore';

interface AccountPillProps {
  onPress?: () => void;
}

/** Vantage-style pill with the active account: "Demo" badge + account
 *  number + chevron. Tap to open accounts list. */
export function AccountPill({ onPress }: AccountPillProps) {
  const theme = useTheme();
  const active = useAccountsStore((s) => s.active);

  const handlePress = onPress ?? (() => router.push('/accounts'));

  if (!active) {
    return (
      <Pressable
        onPress={handlePress}
        haptic="light"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: pressed ? theme.colors.bg.hover : theme.colors.bg.chip,
        })}
      >
        <Text variant="bodyR" tone="primary" weight="medium">Open account</Text>
        <ChevronDown size={14} color={theme.colors.text.secondary} strokeWidth={2} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      haptic="light"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: pressed ? theme.colors.bg.hover : theme.colors.bg.chip,
      })}
    >
      {active.is_demo ? (
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: theme.colors.buy,
          }}
        >
          <Text variant="caption" weight="bold" style={{ color: '#FFFFFF', fontSize: 10 }}>
            DEMO
          </Text>
        </View>
      ) : null}
      <Text variant="bodyR" tone="primary" weight="medium">
        #{active.account_number}
      </Text>
      <ChevronDown size={14} color={theme.colors.text.secondary} strokeWidth={2} />
    </Pressable>
  );
}
