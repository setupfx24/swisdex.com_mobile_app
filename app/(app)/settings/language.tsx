import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Text, Divider, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { useI18nStore } from '@/stores/i18nStore';
import { profileApi } from '@/lib/api/profile';
import { ProfileHeader } from '../profile';

const LANGUAGES: { code: string; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'de', label: 'German', native: 'Deutsch' },
  { code: 'it', label: 'Italian', native: 'Italiano' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
  { code: 'zh', label: 'Chinese', native: '中文' },
  { code: 'ja', label: 'Japanese', native: '日本語' },
  { code: 'ru', label: 'Russian', native: 'Русский' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe' },
];

export default function LanguageScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const activeLang = useI18nStore((s) => s.lang);

  const [selected, setSelected] = useState(activeLang ?? user?.language ?? 'en');
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSelect = async (code: string) => {
    if (code === selected || saving) return;
    const prev = selected;
    setSelected(code);
    setError(null);
    setSaving(code);
    // Apply immediately so the whole app starts translating right away — this
    // also persists the choice locally (survives restart) and offline.
    await useI18nStore.getState().setLang(code);
    try {
      // Persist server-side too — profile carries a `language` field. refreshMe
      // pulls it back into the auth store so it syncs across devices.
      await profileApi.update({ language: code });
      await refreshMe();
    } catch (e: unknown) {
      // Local language switch already applied; only the server sync failed.
      setError(e instanceof Error ? e.message : 'Saved on this device, but could not sync to your profile.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Language' }} />
      <ProfileHeader title="Language" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[8] }}>
        {error ? (
          <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2] }}>
            <Text variant="body" tone="sell">{error}</Text>
          </View>
        ) : null}
        <View style={{ height: theme.spacing[2] }} />
        {LANGUAGES.map((lang, i) => (
          <View key={lang.code}>
            {i === 0 ? <Divider /> : null}
            <Pressable
              haptic="light"
              onPress={() => onSelect(lang.code)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: theme.spacing[4],
                paddingVertical: theme.spacing[3],
                backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
                gap: theme.spacing[3],
              })}
            >
              <View style={{ flex: 1 }}>
                <Text variant="bodyLg" skipTranslate>{lang.native}</Text>
                <Text variant="bodyMd" tone="secondary" skipTranslate>{lang.label}</Text>
              </View>
              {saving === lang.code ? (
                <Text variant="labelXs" tone="tertiary">SAVING…</Text>
              ) : selected === lang.code ? (
                <Check size={20} color={theme.colors.buy} strokeWidth={2} />
              ) : null}
            </Pressable>
            <Divider />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
