import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
// expo-file-system 56 split the legacy global functions (cacheDirectory,
// downloadAsync, etc.) into '/legacy'. The new File/Directory class API
// is friendlier for new code but the legacy path is the shortest route
// to a working CSV/JSON download for now.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Text, Button } from '@/ui';
import { useTheme } from '@/theme';
import { apiConfig } from '@/lib/api';
import { loadTokens } from '@/lib/storage/tokens';
import { ProfileHeader } from './profile';

type Format = 'csv' | 'json';

export default function PortfolioExportScreen() {
  const theme = useTheme();
  const [format, setFormat] = useState<Format>('csv');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onExport = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const tokens = await loadTokens();
      if (!tokens) throw new Error('Not signed in.');
      const url = `${apiConfig.apiBase}/portfolio/export?format=${format}`;
      const filename = `swisdex-trades-${Date.now()}.${format}`;
      const target = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}${filename}`;

      const dl = await FileSystem.downloadAsync(url, target, {
        headers: { Authorization: `Bearer ${tokens.access}` },
      });
      if (dl.status >= 400) throw new Error(`HTTP ${dl.status}`);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dl.uri, {
          mimeType: format === 'csv' ? 'text/csv' : 'application/json',
          dialogTitle: 'Save SwisDex trade history',
        });
      } else {
        setMsg(`Saved to ${dl.uri}`);
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Export' }} />
      <ProfileHeader title="Export trade history" />
      <View style={{ padding: theme.spacing[4], gap: theme.spacing[4] }}>
        <Text variant="bodyMd" tone="secondary">
          Download every closed trade across all your accounts. Use CSV for
          spreadsheets, JSON for programmatic analysis.
        </Text>

        <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
          {(['csv', 'json'] as Format[]).map((f) => {
            const selected = f === format;
            return (
              <Button
                key={f}
                variant={selected ? 'primary' : 'secondary'}
                onPress={() => setFormat(f)}
                disabled={busy}
              >
                {f.toUpperCase()}
              </Button>
            );
          })}
        </View>

        <Button onPress={onExport} loading={busy} size="lg">Download {format.toUpperCase()}</Button>
        {msg ? <Text variant="body" tone={msg.startsWith('Saved') ? 'buy' : 'sell'}>{msg}</Text> : null}
      </View>
    </SafeAreaView>
  );
}
