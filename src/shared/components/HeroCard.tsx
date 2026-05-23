import { View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Text, Pressable } from '@/ui';
import { useTheme } from '@/theme';

interface HeroCardProps {
  title: string;
  subtitle?: string;
  /** Optional chip pills under the title (e.g. "Top 20 · Forex · 7D"). */
  chips?: string[];
  /** CTA label. If omitted, the whole card is tappable instead of a button. */
  cta?: string;
  /** Right-side decoration (icon, illustration). */
  decoration?: React.ReactNode;
  onPress?: () => void;
}

/** Vantage-style promotional hero card. Used on Home for "Top 20 Performing
 *  Signal Providers", on Earn for product offers, on Wallet for promos. */
export function HeroCard({ title, subtitle, chips, cta, decoration, onPress }: HeroCardProps) {
  const theme = useTheme();
  const Body = (
    <View
      style={{
        backgroundColor: theme.colors.bg.secondary,
        borderRadius: theme.radius.lg,
        padding: theme.spacing[5],
        gap: theme.spacing[3],
        overflow: 'hidden',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing[3] }}>
        <View style={{ flex: 1, gap: theme.spacing[2] }}>
          <Text variant="h2">{title}</Text>
          {subtitle ? <Text variant="bodyMd" tone="secondary">{subtitle}</Text> : null}
          {chips && chips.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[1] }}>
              {chips.map((c) => (
                <View
                  key={c}
                  style={{
                    paddingVertical: 2,
                    paddingHorizontal: theme.spacing[2],
                    borderRadius: theme.radius.sm,
                    backgroundColor: theme.colors.bg.chip,
                  }}
                >
                  <Text variant="labelXs" tone="secondary">{c}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        {decoration ? <View style={{ alignSelf: 'flex-start' }}>{decoration}</View> : null}
      </View>

      {cta ? (
        <Pressable
          onPress={onPress}
          haptic="light"
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#E5E5E7' : '#FFFFFF',
            borderRadius: theme.radius.pill,
            paddingVertical: theme.spacing[3],
            paddingHorizontal: theme.spacing[4],
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing[1],
          })}
        >
          <Text variant="bodyLg" weight="bold" tone="inverse">{cta}</Text>
          <ChevronRight size={18} color={theme.colors.text.inverse} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );

  if (!cta && onPress) {
    return (
      <Pressable onPress={onPress} haptic="light">
        {Body}
      </Pressable>
    );
  }
  return Body;
}
