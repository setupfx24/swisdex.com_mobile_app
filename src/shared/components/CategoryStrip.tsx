import { ScrollView, View } from 'react-native';
import { Pressable, Text } from '@/ui';
import { useTheme } from '@/theme';

export interface Category {
  key: string;
  label: string;
}

interface CategoryStripProps {
  categories: Category[];
  active: string;
  onChange: (key: string) => void;
}

/** Horizontal scroll of category tabs with active underline — used on
 *  Markets / Explore and other screens with category filtering. */
export function CategoryStrip({ categories, active, onChange }: CategoryStripProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12 }}
    >
      {categories.map((c) => {
        const isActive = c.key === active;
        return (
          <Pressable
            key={c.key}
            onPress={() => onChange(c.key)}
            haptic="light"
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              alignItems: 'center',
            }}
          >
            <Text
              variant="bodyM"
              tone={isActive ? 'primary' : 'secondary'}
              weight={isActive ? 'bold' : 'regular'}
            >
              {c.label}
            </Text>
            <View
              style={{
                height: 2,
                width: '100%',
                marginTop: 8,
                borderRadius: 999,
                backgroundColor: isActive ? theme.colors.buy : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
