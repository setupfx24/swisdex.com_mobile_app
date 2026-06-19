import { useState } from 'react';
import { Modal, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { Text, Field, Button, Pressable, Divider } from '@/ui';
import { useTheme } from '@/theme';
import { useAccountsStore } from '@/stores/accountsStore';
import { placeOrder } from './orderClient';
import type { OrderType, Side } from '@/types/trading';

interface Props {
  visible: boolean;
  onClose: () => void;
  symbol: string;
  digits: number;
  initialSide: Side;
  initialPrice?: number;
}

/** Limit / stop / stop-limit order entry. Lives in a full-screen modal
 *  (sheet) per CLAUDE.md's bottom-sheet pattern. Market orders go through
 *  QuickTradeBar — this sheet is opened only when the user picks
 *  "Order ticket" or taps a price in the watchlist that needs SL/TP. */
export function OrderSheet({ visible, onClose, symbol, digits, initialSide, initialPrice }: Props) {
  const theme = useTheme();
  const active = useAccountsStore((s) => s.active);
  const [side, setSide] = useState<Side>(initialSide);
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [lots, setLots] = useState('0.01');
  const [price, setPrice] = useState(initialPrice ? initialPrice.toFixed(digits) : '');
  const [stopLimit, setStopLimit] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!active) return setError('Pick an account first.');
    const lotsNum = parseFloat(lots);
    if (!Number.isFinite(lotsNum) || lotsNum < 0.01) return setError('Minimum lot size is 0.01.');
    const priceNum = orderType === 'market' ? undefined : parseFloat(price);
    if (orderType !== 'market' && !Number.isFinite(priceNum)) return setError('Price required.');
    const stopLimitNum = orderType === 'stop_limit' ? parseFloat(stopLimit) : undefined;
    if (orderType === 'stop_limit' && !Number.isFinite(stopLimitNum)) return setError('Stop-limit price required.');
    const slNum = sl.trim() ? parseFloat(sl) : undefined;
    const tpNum = tp.trim() ? parseFloat(tp) : undefined;

    setSubmitting(true);
    try {
      await placeOrder(
        {
          account_id: active.id,
          symbol,
          side,
          order_type: orderType,
          lots: lotsNum,
          price: priceNum,
          stop_limit_price: stopLimitNum,
          stop_loss: slNum,
          take_profit: tpNum,
        },
        { optimistic: orderType === 'market' },
      );
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Order failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: theme.colors.bg.base,
            borderTopLeftRadius: theme.radius['2xl'],
            borderTopRightRadius: theme.radius['2xl'],
            maxHeight: '92%',
            paddingBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              padding: theme.spacing[4],
            }}
          >
            <Text variant="h2">Order ticket</Text>
            <Pressable
              onPress={onClose}
              haptic="light"
              style={({ pressed }) => ({
                width: 36, height: 36,
                borderRadius: theme.radius.lg,
                backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              })}
            >
              <X size={20} color={theme.colors.text.primary} />
            </Pressable>
          </View>
          <Divider />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[3] }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
                {(['buy', 'sell'] as Side[]).map((s) => {
                  const selected = side === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setSide(s)}
                      haptic="light"
                      style={({ pressed }) => ({
                        flex: 1, paddingVertical: theme.spacing[2],
                        borderRadius: theme.radius.md,
                        backgroundColor: selected
                          ? (s === 'buy' ? theme.colors.buy : theme.colors.sell)
                          : pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                        borderWidth: 1,
                        borderColor: selected
                          ? (s === 'buy' ? theme.colors.buy : theme.colors.sell)
                          : theme.colors.border.primary,
                        alignItems: 'center',
                      })}
                    >
                      <Text variant="bodyMd" weight="bold" style={{ color: selected ? '#fff' : theme.colors.text.primary, letterSpacing: 1 }}>
                        {s.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] }}>
                {(['market', 'limit', 'stop', 'stop_limit'] as OrderType[]).map((t) => {
                  const selected = orderType === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setOrderType(t)}
                      haptic="light"
                      style={({ pressed }) => ({
                        paddingVertical: theme.spacing[1],
                        paddingHorizontal: theme.spacing[3],
                        borderRadius: theme.radius.full,
                        backgroundColor: selected ? theme.colors.bg.tertiary : pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                        borderWidth: 1,
                        borderColor: selected ? theme.colors.text.primary : theme.colors.border.primary,
                      })}
                    >
                      <Text variant="labelXs" tone={selected ? 'primary' : 'secondary'} weight={selected ? 'bold' : 'medium'}>
                        {t.replace('_', '-').toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Field label="Lots" value={lots} onChangeText={setLots} keyboardType="decimal-pad" editable={!submitting} />
              {orderType !== 'market' ? (
                <Field
                  label={orderType === 'limit' ? 'Limit price' : 'Trigger price'}
                  hint={
                    orderType === 'limit'
                      ? side === 'buy' ? 'Fills at or below this price' : 'Fills at or above this price'
                      : side === 'buy' ? 'Fills when price rises through' : 'Fills when price falls through'
                  }
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  editable={!submitting}
                />
              ) : null}
              {orderType === 'stop_limit' ? (
                <Field label="Limit price" hint="Limit applied once the trigger fires" value={stopLimit} onChangeText={setStopLimit} keyboardType="decimal-pad" editable={!submitting} />
              ) : null}
              <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
                <View style={{ flex: 1 }}>
                  <Field label="Stop loss" hint="Optional" value={sl} onChangeText={setSl} keyboardType="decimal-pad" editable={!submitting} />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Take profit" hint="Optional" value={tp} onChangeText={setTp} keyboardType="decimal-pad" editable={!submitting} />
                </View>
              </View>

              {error ? <Text variant="body" tone="sell">{error}</Text> : null}

              <Button
                variant={side === 'buy' ? 'buy' : 'sell'}
                size="xl"
                onPress={onSubmit}
                loading={submitting}
              >
                {orderType === 'market'
                  ? `${side.toUpperCase()} at market`
                  : `Place ${side.toUpperCase()} ${orderType.replace('_', '-')}`}
              </Button>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}
