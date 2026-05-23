import { View } from 'react-native';
import { Search, MessageCircle, ChevronLeft } from 'lucide-react-native';
import { Pressable, Text } from '@/ui';
import { useTheme } from '@/theme';

interface HeaderBarProps {
  title?: string;
  showAvatar?: boolean;
  avatarLabel?: string;
  showBack?: boolean;
  onBack?: () => void;
  onSearch?: () => void;
  onChat?: () => void;
  chatBadge?: boolean;
  right?: React.ReactNode;
}

/** Vantage-style top header: 56pt tall, no bottom border, avatar (or back
 *  chevron / title) on the left and action icons on the right. */
export function HeaderBar({
  title,
  showAvatar = false,
  avatarLabel,
  showBack = false,
  onBack,
  onSearch,
  onChat,
  chatBadge = false,
  right,
}: HeaderBarProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        height: 56,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.bg.primary,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        {showBack ? (
          <Pressable
            onPress={onBack}
            haptic="light"
            style={({ pressed }) => ({
              width: 40, height: 40, borderRadius: 999,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
            })}
          >
            <ChevronLeft size={24} color={theme.colors.text.primary} strokeWidth={1.5} />
          </Pressable>
        ) : showAvatar ? (
          <View
            style={{
              width: 40, height: 40, borderRadius: 999,
              backgroundColor: theme.colors.bg.tertiary,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text variant="bodyB" tone="primary">
              {(avatarLabel ?? 'U').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        ) : null}

        {title ? <Text variant="title1">{title}</Text> : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        {right ?? (
          <>
            {onSearch ? (
              <Pressable
                onPress={onSearch}
                haptic="light"
                style={({ pressed }) => ({
                  width: 40, height: 40, borderRadius: 999,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
                })}
              >
                <Search size={22} color={theme.colors.text.primary} strokeWidth={1.5} />
              </Pressable>
            ) : null}
            {onChat ? (
              <Pressable
                onPress={onChat}
                haptic="light"
                style={({ pressed }) => ({
                  width: 40, height: 40, borderRadius: 999,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
                })}
              >
                <MessageCircle size={22} color={theme.colors.text.primary} strokeWidth={1.5} />
                {chatBadge ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 10, right: 10,
                      width: 8, height: 8, borderRadius: 999,
                      backgroundColor: theme.colors.sell,
                    }}
                  />
                ) : null}
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
