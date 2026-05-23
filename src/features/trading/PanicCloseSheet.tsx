import { useState, useEffect, useRef } from 'react';
import { Modal, View, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import { Text, Pressable, Divider, Button } from '@/ui';
import { useTheme } from '@/theme';
import { useAccountsStore } from '@/stores/accountsStore';
import { usePositionsStore } from '@/stores/positionsStore';
import { positionsApi } from '@/lib/api/positions';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Optional symbol filter — used when invoked from the per-symbol
   *  positions panel on the Trade tab. */
  symbolFilter?: string;
}

const HOLD_MS = 1_200;

/** Close-all sheet with HOLD-TO-CONFIRM gesture per CLAUDE.md: "Panic
 *  close sheet: hold-to-confirm gesture". Releases before the timer
 *  fires = cancel; holding past HOLD_MS triggers the bulk close. Uses
 *  /positions/close-all with the right filter. */
export function PanicCloseSheet({ visible, onClose, symbolFilter }: Props) {
  const theme = useTheme();
  const active = useAccountsStore((s) => s.active);
  const positions = usePositionsStore((s) => s.positions);
  const load = usePositionsStore((s) => s.load);

  const [filter, setFilter] = useState<'all' | 'profit' | 'loss' | 'symbol'>(symbolFilter ? 'symbol' : 'all');
  const [pressing, setPressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setError(null);
      setPressing(false);
      progress.setValue(0);
      if (holdTimer.current) clearTimeout(holdTimer.current);
    }
  }, [visible, progress]);

  const eligible = positions.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'profit') return (p.profit ?? 0) > 0;
    if (filter === 'loss') return (p.profit ?? 0) < 0;
    if (filter === 'symbol' && symbolFilter) return p.symbol === symbolFilter;
    return false;
  });

  const startHold = () => {
    if (!active || eligible.length === 0) return;
    setPressing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
    holdTimer.current = setTimeout(() => {
      void doClose();
    }, HOLD_MS);
  };

  const cancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setPressing(false);
    Animated.timing(progress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const doClose = async () => {
    if (!active) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await positionsApi.closeAll({
        account_id: active.id,
        filter,
        ...(filter === 'symbol' && symbolFilter ? { symbols: [symbolFilter] } : {}),
      });
      await load(active.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();
      // res.closed / res.failed could surface as a toast — leaving to caller for now.
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Close failed.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: theme.colors.bg.base,
            borderTopLeftRadius: theme.radius['2xl'],
            borderTopRightRadius: theme.radius['2xl'],
            paddingBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              padding: theme.spacing[4],
            }}
          >
            <Text variant="h2">Panic close</Text>
            <Pressable onPress={onClose} haptic="light" style={({ pressed }) => ({
              width: 36, height: 36,
              borderRadius: theme.radius.lg,
              backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            })}>
              <X size={20} color={theme.colors.text.primary} />
            </Pressable>
          </View>
          <Divider />

          <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] }}>
              {([
                { k: 'all' as const, label: 'All' },
                { k: 'profit' as const, label: 'In profit' },
                { k: 'loss' as const, label: 'In loss' },
                ...(symbolFilter ? [{ k: 'symbol' as const, label: symbolFilter }] : []),
              ]).map(({ k, label }) => {
                const selected = filter === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setFilter(k)}
                    haptic="light"
                    style={({ pressed }) => ({
                      paddingVertical: theme.spacing[1],
                      paddingHorizontal: theme.spacing[3],
                      borderRadius: theme.radius.full,
                      backgroundColor: selected ? theme.colors.sell : pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                      borderWidth: 1,
                      borderColor: selected ? theme.colors.sell : theme.colors.border.primary,
                    })}
                  >
                    <Text variant="labelXs" tone={selected ? 'inverse' : 'secondary'} weight={selected ? 'bold' : 'medium'}>
                      {label.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text variant="bodyMd" tone="secondary">
              Will close <Text variant="bodyMd" weight="bold">{eligible.length}</Text> position{eligible.length === 1 ? '' : 's'}. This cannot be undone.
            </Text>

            {error ? <Text variant="body" tone="sell">{error}</Text> : null}

            <Pressable
              onPressIn={startHold}
              onPressOut={cancelHold}
              haptic={null}
              disabled={!active || eligible.length === 0 || submitting}
              style={{
                height: theme.hitTargets.buyButton,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.sell,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: !active || eligible.length === 0 || submitting ? 0.5 : 1,
              }}
            >
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0, top: 0, bottom: 0,
                  width: progressWidth,
                  backgroundColor: theme.colors.sellDark,
                }}
              />
              <Text variant="bodyLg" weight="bold" style={{ color: '#fff', letterSpacing: 1 }}>
                {submitting ? 'CLOSING…' : pressing ? 'HOLD TO CONFIRM' : 'HOLD TO CLOSE ALL'}
              </Text>
            </Pressable>

            <Button variant="ghost" onPress={onClose}>Cancel</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
