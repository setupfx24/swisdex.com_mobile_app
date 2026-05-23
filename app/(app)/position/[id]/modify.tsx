import { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Text, Field, Button, Num } from '@/ui';
import { useTheme } from '@/theme';
import { positionsApi } from '@/lib/api/positions';
import { usePositionsStore } from '@/stores/positionsStore';
import { useAccountsStore } from '@/stores/accountsStore';
import { ProfileHeader } from '../../profile';

export default function ModifyPositionScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const position = usePositionsStore((s) => s.positions.find((p) => p.id === String(id)));
  const active = useAccountsStore((s) => s.active);

  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!position) return;
    setSl(position.stop_loss != null ? String(position.stop_loss) : '');
    setTp(position.take_profit != null ? String(position.take_profit) : '');
  }, [position]);

  if (!position) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
        <Stack.Screen options={{ title: 'Modify' }} />
        <ProfileHeader title="Modify position" />
        <View style={{ padding: theme.spacing[4] }}>
          <Text variant="bodyMd" tone="tertiary">Position no longer open.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onSubmit = async () => {
    setError(null);
    const slNum = sl.trim() === '' ? null : parseFloat(sl);
    const tpNum = tp.trim() === '' ? null : parseFloat(tp);
    if (sl.trim() && !Number.isFinite(slNum)) return setError('SL is not a number.');
    if (tp.trim() && !Number.isFinite(tpNum)) return setError('TP is not a number.');
    setSubmitting(true);
    try {
      await positionsApi.modify(position.id, { stop_loss: slNum, take_profit: tpNum });
      if (active) await usePositionsStore.getState().load(active.id);
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Modify failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Modify' }} />
      <ProfileHeader title="Modify position" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            <Text variant="body" tone="secondary">Open at {position.open_price}</Text>
            <Num value={position.profit} digits={2} pnl signed variant="numLg" />
          </View>

          <Field label="Stop loss" hint="Leave blank to remove." value={sl} onChangeText={setSl} keyboardType="decimal-pad" editable={!submitting} />
          <Field label="Take profit" hint="Leave blank to remove." value={tp} onChangeText={setTp} keyboardType="decimal-pad" editable={!submitting} />

          {error ? <Text variant="body" tone="sell">{error}</Text> : null}
          <Button onPress={onSubmit} loading={submitting} size="lg">Update SL / TP</Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
