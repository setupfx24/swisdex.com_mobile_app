import { useEffect, useState } from 'react';
import { View, ScrollView, Linking } from 'react-native';
import { Text, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { bannersApi } from '@/lib/api/banners';
import type { Banner } from '@/types/notifications';

/** Horizontal swipe-strip of broker banners. Pulled in on mount, cached
 *  in component state — banners change rarely so no polling needed. */
export function BannerStrip() {
  const theme = useTheme();
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    // /banners may return a raw array or a {items:[]} envelope depending on
    // backend version. Normalise so .map() never blows up on the JSX path.
    bannersApi
      .list()
      .then((res) => {
        const list = Array.isArray(res)
          ? res
          : Array.isArray((res as { items?: Banner[] })?.items)
            ? (res as { items: Banner[] }).items
            : [];
        setBanners(list);
      })
      .catch(() => setBanners([]));
  }, []);

  if (banners.length === 0) return null;

  const variantColor = (v: Banner['variant']) => {
    switch (v) {
      case 'warning': return theme.colors.warning;
      case 'success': return theme.colors.buy;
      case 'promo':   return theme.colors.text.accent;
      default:        return theme.colors.info;
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: theme.spacing[2], paddingHorizontal: theme.spacing[4] }}
      style={{ paddingBottom: theme.spacing[2] }}
    >
      {banners.map((b) => (
        <Pressable
          key={b.id}
          onPress={() => { if (b.link_url) void Linking.openURL(b.link_url); }}
          haptic="light"
          style={({ pressed }) => ({
            width: 260,
            paddingHorizontal: theme.spacing[3],
            paddingVertical: theme.spacing[3],
            borderRadius: theme.radius.lg,
            backgroundColor: pressed ? theme.colors.bg.active : theme.colors.bg.secondary,
            borderLeftWidth: 3,
            borderLeftColor: variantColor(b.variant),
            borderRightWidth: 1, borderTopWidth: 1, borderBottomWidth: 1,
            borderRightColor: theme.colors.border.primary,
            borderTopColor: theme.colors.border.primary,
            borderBottomColor: theme.colors.border.primary,
          })}
        >
          <Text variant="bodyMd" weight="bold" numberOfLines={1}>{b.title}</Text>
          <Text variant="body" tone="secondary" numberOfLines={2}>{b.body}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
