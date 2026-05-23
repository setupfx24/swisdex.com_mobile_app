import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Text, Field, Button, Num } from '@/ui';
import { useTheme } from '@/theme';
import { positionsApi } from '@/lib/api/positions';
import { usePositionsStore } from '@/stores/positionsStore';
import { useAccountsStore } from '@/stores/accountsStore';
import { ProfileHeader } from '../../profile';

export default function PartialCloseScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const position = usePositionsStore((s) => s.positions.find((p) => p.id === String(id)));
  const active = useAccountsStore((s) => s.active);

  const [lots, setLots] = useState(position ? (position.lots / 2).toFixed(2) : '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!position) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
        <Stack.Screen options={{ title: 'Close' }} />
        <ProfileHeader title="Partial close" />
        <View style={{ padding: theme.spacing[4] }}>
          <Text variant="bodyMd" tone="tertiary">Position no longer open.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onSubmit = async () => {
    setError(null);
    const lotsNum = parseFloat(lots);
    if (!Number.isFinite(lotsNum) || lotsNum <= 0) return setError('Lots must be > 0.');
    if (lotsNum > position.lots) return setError(`Cannot close more than ${position.lots} lots.`);
    setSubmitting(true);
    try {
      await positionsApi.close(position.id, { lots: lotsNum });
      if (active) await usePositionsStore.getState().load(active.id);
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Close failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Close' }} />
      <ProfileHeader title="Partial close" />
      <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
        <View
          style={{
            padding: theme.spacing[3],
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.bg.secondary,
            borderWidth: 1,
            borderColor: theme.colors.border.primary,
          }}
        >
          <Text variant="bodyMd" weight="medium" tone={position.side === 'buy' ? 'buy' : 'sell'}>
            {position.side.toUpperCase()} {position.lots} {position.symbol}
          </Text>
          <Num value={position.profit} digits={2} pnl signed variant="numLg" />
        </View>

        <Field
          label="Lots to close"
          hint={`Open: ${position.lots}`}
          value={lots}
          onChangeText={setLots}
          keyboardType="decimal-pad"
          editable={!submitting}
        />

        {error ? <Text variant="body" tone="sell">{error}</Text> : null}
        <Button variant="danger" onPress={onSubmit} loading={submitting} size="lg">
          Close {lots} lots
        </Button>
      </View>
    </SafeAreaView>
  );
}
