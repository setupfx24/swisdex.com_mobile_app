import { View, ScrollView } from 'react-native';
import { Text, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { TIMEFRAMES } from './timeframes';
import type { Timeframe } from './types';

interface Props {
  value: Timeframe;
  onChange: (tf: Timeframe) => void;
}

export function TimeframePills({ value, onChange }: Props) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: theme.spacing[1], paddingHorizontal: theme.spacing[4] }}
    >
      {TIMEFRAMES.map((t) => {
        const selected = t.key === value;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            haptic="light"
            style={({ pressed }) => ({
              paddingVertical: theme.spacing[1],
              paddingHorizontal: theme.spacing[3],
              borderRadius: theme.radius.md,
              backgroundColor: selected ? theme.colors.buy : pressed ? theme.colors.bg.hover : 'transparent',
              minWidth: 36,
              alignItems: 'center',
            })}
          >
            <Text
              variant="labelXs"
              tone={selected ? 'inverse' : 'secondary'}
              weight={selected ? 'bold' : 'medium'}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

interface ContainerProps {
  children: React.ReactNode;
}
export function TimeframeBar({ children }: ContainerProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        paddingVertical: theme.spacing[2],
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.primary,
      }}
    >
      {children}
    </View>
  );
}
