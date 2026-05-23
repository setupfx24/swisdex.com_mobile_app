import { View } from 'react-native';
import { Text, Pressable } from '@/ui';
import { useTheme } from '@/theme';

export interface QuickAction {
  key: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  onPress?: () => void;
}

interface Props {
  items: QuickAction[];
}

/** Vantage-style 4-up icon grid used on Home + Wallet.
 *  Each tile: 56pt circle icon container, label beneath, optional badge chip
 *  in top-right corner of the icon. */
export function QuickActionGrid({ items }: Props) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing[2],
        gap: theme.spacing[2],
      }}
    >
      {items.map((it) => (
        <Pressable
          key={it.key}
          onPress={it.onPress}
          haptic="light"
          style={({ pressed }) => ({
            flex: 1,
            alignItems: 'center',
            gap: theme.spacing[1],
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View
            style={{
              width: 56, height: 56,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.bg.secondary,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {it.icon}
            {it.badge ? (
              <View
                style={{
                  position: 'absolute',
                  top: -2, right: -2,
                  backgroundColor: theme.colors.sell,
                  borderRadius: theme.radius.sm,
                  paddingHorizontal: 6, paddingVertical: 1,
                }}
              >
                <Text variant="labelXs" style={{ color: '#FFFFFF', fontSize: 9 }}>{it.badge}</Text>
              </View>
            ) : null}
          </View>
          <Text variant="bodyMd" weight="regular" align="center" numberOfLines={1}>
            {it.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
