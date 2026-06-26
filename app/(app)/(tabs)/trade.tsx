import { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronDown, MoreVertical, BarChart2, Bell, Minus, Plus, Maximize2,
} from 'lucide-react-native';
import { Text, Num, Pressable, Divider, Button, Field, GradientBackground } from '@/ui';
import { useTheme } from '@/theme';
import { ProfileCompleteGate } from '@/features/auth/ProfileCompleteGate';
import { useMarketDataStore } from '@/stores/marketDataStore';
import { useAccountsStore } from '@/stores/accountsStore';
import { usePositionsStore } from '@/stores/positionsStore';
import { priceSocket } from '@/lib/ws/priceSocket';
import { tradeSocket } from '@/lib/ws/tradeSocket';
import { startWebSocketLifecycle } from '@/lib/ws/appStateLifecycle';
import { DualPriceButton } from '@/features/trading/components/DualPriceButton';
import { InsuranceTierPicker } from '@/features/trading/InsuranceTierPicker';
import { placeOrder } from '@/features/trading/orderClient';
import { PositionsPanel } from '@/features/trading/PositionsPanel';
import { PanicCloseSheet } from '@/features/trading/PanicCloseSheet';
import { TradingViewChart } from '@/charts/TradingViewChart';
import { instrumentsApi } from '@/lib/api/instruments';
import { accountsApi } from '@/lib/api/accounts';
import { isCentAccount, fmtAccountMoney } from '@/lib/money';
import type { OrderType } from '@/types/trading';

const LEVERAGE_OPTIONS = [1, 25, 50, 100, 200, 300, 500, 1000, 2000];

/** Vantage-style Trade terminal: account pill, symbol selector,
 *  signature dual buy/sell pill, volume stepper, info rows, big CTA. */
export default function TradeTab() {
  const theme = useTheme();
  const symbol = useMarketDataStore((s) => s.selectedSymbol);
  const instruments = useMarketDataStore((s) => s.instruments);
  const tick = useMarketDataStore((s) => s.prices[symbol]);
  const updateTick = useMarketDataStore((s) => s.updateTick);
  const setInstruments = useMarketDataStore((s) => s.setInstruments);
  const active = useAccountsStore((s) => s.active);
  const patchAccount = useAccountsStore((s) => s.patchAccount);
  const loadPositions = usePositionsStore((s) => s.load);

  // Leverage picker (per-account; applies immediately via the leverage API).
  const [leverageModalOpen, setLeverageModalOpen] = useState(false);
  const [savingLev, setSavingLev] = useState<number | null>(null);
  const [levError, setLevError] = useState<string | null>(null);

  const [lots, setLots] = useState('0.01');
  const [side, setSide] = useState<'buy' | 'sell' | null>(null);
  // Direction chosen from the dual price pill; the big CTA executes it.
  const [selectedSide, setSelectedSide] = useState<'buy' | 'sell'>('buy');
  const [toast, setToast] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [pendingSide, setPendingSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState('');
  const [stopLimit, setStopLimit] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [pendingSubmitting, setPendingSubmitting] = useState(false);
  const [panicOpen, setPanicOpen] = useState(false);
  // Trade insurance chosen on the order ticket (market only). insKey remounts
  // the picker to reset it after a trade.
  const [insuranceSel, setInsuranceSel] = useState<{ tier: string; fee: number } | null>(null);
  const [insKey, setInsKey] = useState(0);
  const instrument = useMemo(
    () => instruments.find((i) => i.symbol === symbol),
    [instruments, symbol],
  );
  const digits = instrument?.digits ?? 5;

  useEffect(() => {
    startWebSocketLifecycle();
    const unsub = priceSocket.subscribe(updateTick);
    priceSocket.connect();
    return unsub;
  }, [updateTick]);

  // Ensure instrument specs (contract_size, digits) are loaded — the margin
  // calc needs the right contract_size or it falls back to the forex default
  // (100k) and shows a wildly wrong number for metals/indices/crypto.
  useEffect(() => {
    if (instruments.length === 0) {
      instrumentsApi.list().then(setInstruments).catch(() => {});
    }
  }, [instruments.length, setInstruments]);

  useEffect(() => {
    if (!active) return;
    void tradeSocket.connect(active.id);
    void loadPositions(active.id);
  }, [active, loadPositions]);

  const bump = (delta: number) => {
    const cur = parseFloat(lots) || 0;
    const next = Math.max(0.01, +(cur + delta).toFixed(2));
    setLots(next.toFixed(2));
  };

  const flash = (msg: string, ms = 1_500) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  // Market order — fills immediately, optimistically injected. Optional
  // SL/TP ride along on the order so the position opens with them set.
  const submit = async (dir: 'buy' | 'sell') => {
    if (!active) return flash('No account selected.', 3_000);
    const lotsNum = parseFloat(lots);
    if (!Number.isFinite(lotsNum) || lotsNum < 0.01) return flash('Minimum lot size is 0.01.', 3_000);
    const slNum = sl.trim() ? parseFloat(sl) : undefined;
    const tpNum = tp.trim() ? parseFloat(tp) : undefined;
    setSide(dir);
    const insuranceChoice = insuranceSel;
    try {
      await placeOrder(
        {
          account_id: active.id,
          symbol,
          side: dir,
          order_type: 'market',
          lots: lotsNum,
          stop_loss: slNum,
          take_profit: tpNum,
        },
        {
          optimistic: true,
          insuranceChoice,
          onInsuranceError: (msg) => flash(`Insurance not activated: ${msg}`, 4_000),
        },
      );
      flash(
        insuranceChoice
          ? `${dir.toUpperCase()} ${lots} ${symbol} — insured (${fmtAccountMoney(insuranceChoice.fee, isCent)})`
          : `${dir.toUpperCase()} ${lots} ${symbol}`,
      );
      // Reset the insurance picker so the next trade starts fresh.
      setInsuranceSel(null);
      setInsKey((k) => k + 1);
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Order failed', 3_000);
    } finally {
      setSide(null);
    }
  };

  // Limit / stop / stop-limit — stored as pending, no optimistic position.
  const submitPending = async () => {
    if (!active) return flash('No account selected.', 3_000);
    const lotsNum = parseFloat(lots);
    if (!Number.isFinite(lotsNum) || lotsNum < 0.01) return flash('Minimum lot size is 0.01.', 3_000);
    const dir = pendingSide;
    const priceNum = parseFloat(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return flash(orderType === 'limit' ? 'Limit price required.' : 'Trigger price required.', 3_000);
    }
    const stopLimitNum = orderType === 'stop_limit' ? parseFloat(stopLimit) : undefined;
    if (orderType === 'stop_limit' && (!Number.isFinite(stopLimitNum) || (stopLimitNum ?? 0) <= 0)) {
      return flash('Limit price required.', 3_000);
    }
    const slNum = sl.trim() ? parseFloat(sl) : undefined;
    const tpNum = tp.trim() ? parseFloat(tp) : undefined;
    setPendingSubmitting(true);
    try {
      await placeOrder({
        account_id: active.id,
        symbol,
        side: dir,
        order_type: orderType,
        lots: lotsNum,
        price: priceNum,
        stop_limit_price: stopLimitNum,
        stop_loss: slNum,
        take_profit: tpNum,
      });
      flash(`${dir.toUpperCase()} ${orderType.replace('_', '-')} ${lots} ${symbol} placed`);
      setPrice('');
      setStopLimit('');
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Order failed', 3_000);
    } finally {
      setPendingSubmitting(false);
    }
  };

  const equity = active?.equity ?? 0;
  const leverage = active?.leverage ?? 100;

  // Allowed leverage steps for this account, capped at the group's ceiling.
  const levMax = Number(
    active?.account_group?.effective_max_leverage
    ?? active?.account_group?.max_leverage
    ?? active?.account_group?.leverage_default
    ?? leverage,
  );
  const leverageOptions = useMemo(() => {
    const opts = LEVERAGE_OPTIONS.filter((l) => l <= levMax);
    if (levMax > 0 && !opts.includes(levMax)) opts.push(levMax);
    return Array.from(new Set(opts)).sort((a, b) => a - b);
  }, [levMax]);

  const applyLeverage = async (lev: number) => {
    if (!active) return;
    if (lev === active.leverage) { setLeverageModalOpen(false); return; }
    setSavingLev(lev);
    setLevError(null);
    try {
      await accountsApi.setLeverage(active.id, lev);
      patchAccount(active.id, { leverage: lev });
      setLeverageModalOpen(false);
    } catch (e: unknown) {
      setLevError(e instanceof Error ? e.message : 'Could not update leverage.');
    } finally {
      setSavingLev(null);
    }
  };

  const margin = useMemo(() => {
    const lotsNum = parseFloat(lots) || 0;
    // contract_size arrives as a string ("100.0000") from the Decimal field —
    // coerce. When the instrument spec hasn't loaded yet, return null so we
    // show "—" instead of a wrong number from the 100k forex default.
    const cs = Number(instrument?.contract_size);
    const price = tick?.ask ?? tick?.bid ?? 0;
    if (!price || !Number.isFinite(cs) || cs <= 0 || lotsNum <= 0) return null;
    return (lotsNum * cs * price) / leverage;
  }, [lots, instrument, tick, leverage]);

  const freeMargin = Math.max(0, equity - (margin ?? 0));
  const marginLevelAfter = margin && margin > 0 ? (equity / margin) * 100 : 0;
  // Cent accounts display money in ¢ (value ×100); standard accounts in USD.
  const isCent = isCentAccount(active);

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <ProfileCompleteGate />

      {/* Top: CFDs header + 3-dot */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: theme.spacing[4],
          paddingTop: theme.spacing[2], paddingBottom: theme.spacing[2],
          gap: theme.spacing[2],
        }}
      >
        <Text variant="bodyLg" weight="bold">CFDs</Text>
        <View style={{ flex: 1 }} />
        <Pressable haptic="light" onPress={() => {}} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={20} color={theme.colors.text.primary} strokeWidth={1.75} />
        </Pressable>
        <Pressable haptic="light" onPress={() => router.push('/accounts')} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <MoreVertical size={20} color={theme.colors.text.primary} strokeWidth={1.75} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing[4],
          paddingBottom: theme.hitTargets.tabBarBottom + theme.spacing[6],
          gap: theme.spacing[4],
        }}
      >
        {/* Account pill + equity */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            haptic="light"
            onPress={() => router.push('/accounts')}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center',
              gap: theme.spacing[2],
              paddingVertical: theme.spacing[2],
              paddingHorizontal: theme.spacing[3],
              borderRadius: theme.radius.pill,
              backgroundColor: pressed ? theme.colors.bg.hover : theme.colors.bg.chip,
            })}
          >
            {active?.is_demo ? (
              <View
                style={{
                  paddingHorizontal: theme.spacing[2], paddingVertical: 2,
                  borderRadius: theme.radius.sm,
                  backgroundColor: 'rgba(167,139,250,0.18)',
                }}
              >
                <Text variant="labelXs" style={{ color: '#A78BFA', fontSize: 10 }}>DEMO</Text>
              </View>
            ) : null}
            <Text variant="bodyMd" weight="medium">
              {active ? `#${active.account_number}` : 'Pick account'}
            </Text>
            <ChevronDown size={14} color={theme.colors.text.secondary} />
          </Pressable>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="labelXs" tone="secondary">Equity USD</Text>
            <Num value={equity} digits={2} variant="num" />
          </View>
        </View>

        {/* Symbol selector */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            haptic="light"
            onPress={() => router.push('/instruments')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1] }}
          >
            <Text variant="h1">{symbol}</Text>
            <ChevronDown size={20} color={theme.colors.text.primary} />
          </Pressable>
          <Pressable
            haptic="light"
            onPress={() => {}}
            style={{
              width: 40, height: 40,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.bg.secondary,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <BarChart2 size={20} color={theme.colors.text.primary} strokeWidth={1.75} />
          </Pressable>
        </View>

        {/* TradingView Advanced Chart — the exact widget the web trader
         *  uses. Full indicators / drawing tools / timeframes built in.
         *  Symbol follows whatever the user tapped in Markets / Instruments. */}
        <View
          style={{
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.bg.secondary,
            overflow: 'hidden',
            height: 480,
          }}
        >
          <TradingViewChart symbol={symbol} />
          {/* Expand → full-screen chart */}
          <Pressable
            haptic="light"
            onPress={() => router.push({ pathname: '/chart', params: { symbol } })}
            style={{
              position: 'absolute', top: theme.spacing[2], right: theme.spacing[2],
              width: 34, height: 34, borderRadius: theme.radius.md,
              backgroundColor: theme.colors.bg.base + 'CC',
              borderWidth: 1, borderColor: theme.colors.border.primary,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Maximize2 size={18} color={theme.colors.text.primary} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Order type selector */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] }}>
          {(['market', 'limit', 'stop'] as OrderType[]).map((t) => {
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

        {/* MARKET: signature dual buy/sell pill. PENDING: side toggle +
         *  trigger/limit inputs + a single confirm button. */}
        {orderType === 'market' ? (
          <DualPriceButton
            bid={tick?.bid}
            ask={tick?.ask}
            digits={digits}
            selected={selectedSide}
            onSell={() => { setSelectedSide('sell'); void submit('sell'); }}
            onBuy={() => { setSelectedSide('buy'); void submit('buy'); }}
            disabled={side !== null || !tick}
          />
        ) : (
          <View style={{ gap: theme.spacing[3] }}>
            <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
              {(['buy', 'sell'] as const).map((s) => {
                const selected = pendingSide === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setPendingSide(s)}
                    haptic="light"
                    style={({ pressed }) => ({
                      flex: 1, paddingVertical: theme.spacing[2],
                      borderRadius: theme.radius.md,
                      backgroundColor: selected
                        ? (s === 'buy' ? '#34C759' : '#FF3B30')
                        : pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                      borderWidth: 1,
                      borderColor: selected
                        ? (s === 'buy' ? '#34C759' : '#FF3B30')
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
            <Field
              label={orderType === 'limit' ? 'Limit price' : 'Trigger price'}
              hint={
                orderType === 'limit'
                  ? pendingSide === 'buy' ? 'Fills at or below this price' : 'Fills at or above this price'
                  : pendingSide === 'buy' ? 'Fills when price rises through' : 'Fills when price falls through'
              }
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              editable={!pendingSubmitting}
            />
            {orderType === 'stop_limit' ? (
              <Field
                label="Limit price"
                hint="Limit applied once the trigger fires"
                value={stopLimit}
                onChangeText={setStopLimit}
                keyboardType="decimal-pad"
                editable={!pendingSubmitting}
              />
            ) : null}
            <Button
              variant="buy"
              color={pendingSide === 'buy' ? '#34C759' : '#FF3B30'}
              size="xl"
              onPress={submitPending}
              loading={pendingSubmitting}
            >
              Place {pendingSide.toUpperCase()} {orderType.replace('_', '-')}
            </Button>
          </View>
        )}

        {/* Stop loss / Take profit at entry — applies to market + pending */}
        <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
          <View style={{ flex: 1 }}>
            <Field label="Stop loss" hint="Optional" value={sl} onChangeText={setSl} keyboardType="decimal-pad" editable={side === null && !pendingSubmitting} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Take profit" hint="Optional" value={tp} onChangeText={setTp} keyboardType="decimal-pad" editable={side === null && !pendingSubmitting} />
          </View>
        </View>
        {sl.trim() || tp.trim() ? (
          <Text variant="body" tone="tertiary">SL/TP apply to the position once this order fills.</Text>
        ) : null}

        {/* Trade insurance — market orders only. (No admin gate here: the
            account list doesn't reliably carry insurance_enabled; if insurance
            is off server-side, toggling shows a graceful message.) */}
        {orderType === 'market' && active ? (
          <InsuranceTierPicker
            key={insKey}
            accountId={active.id}
            isCent={isCent}
            symbol={symbol}
            side={selectedSide}
            lots={parseFloat(lots) || 0}
            leverage={active.leverage}
            stopLoss={sl.trim() ? parseFloat(sl) : undefined}
            takeProfit={tp.trim() ? parseFloat(tp) : undefined}
            onSelect={setInsuranceSel}
          />
        ) : null}

        {/* Volume stepper */}
        <View
          style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[3],
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.bg.secondary,
            gap: theme.spacing[3],
          }}
        >
          <Pressable
            haptic="light"
            onPress={() => bump(-0.01)}
            style={{
              width: 36, height: 36,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.bg.chip,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Minus size={16} color={theme.colors.text.primary} strokeWidth={2.5} />
          </Pressable>
          {/* Editable lot size — type manually or use +/-. */}
          <TextInput
            value={lots}
            onChangeText={setLots}
            keyboardType="decimal-pad"
            placeholder="0.01"
            placeholderTextColor={theme.colors.text.tertiary}
            selectTextOnFocus
            style={{
              flex: 1,
              textAlign: 'center',
              color: theme.colors.text.primary,
              fontSize: 20,
              fontWeight: '700',
              fontVariant: ['tabular-nums'],
              paddingVertical: 0,
            }}
          />
          <Pressable
            haptic="light"
            onPress={() => bump(0.01)}
            style={{
              width: 36, height: 36,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.bg.chip,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Plus size={16} color={theme.colors.text.primary} strokeWidth={2.5} />
          </Pressable>
          <Text variant="bodyMd" weight="medium" tone="secondary">Lots</Text>
        </View>

        {/* Info rows */}
        <View
          style={{
            padding: theme.spacing[4],
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.bg.secondary,
            gap: theme.spacing[3],
          }}
        >
          <InfoRow theme={theme} label="Margin Required" value={margin != null ? fmtAccountMoney(margin, isCent) : '—'} />
          <InfoRow theme={theme} label="Free Margin" value={fmtAccountMoney(freeMargin, isCent)} />
          <InfoRow
            theme={theme}
            label="Margin Level After"
            value={marginLevelAfter > 0 ? `${marginLevelAfter.toFixed(2)}%` : '—'}
          />
          <InfoRow theme={theme} label="Leverage" value={`1:${leverage}`} onPress={active ? () => { setLevError(null); setLeverageModalOpen(true); } : undefined} />
        </View>

        {/* Market orders execute on tap of the Sell / Buy price pill above —
            no separate confirm button. (Pending orders keep their own Place
            button in the pending-price section.) */}
        {orderType === 'market' ? (
          <Text variant="body" tone="tertiary" align="center">
            Tap Sell or Buy above to place the trade instantly.
          </Text>
        ) : null}

        {/* Open + closed positions for ALL instruments on the active account
            (not just the selected symbol) + panic close. */}
        <View style={{ paddingTop: theme.spacing[2] }}>
          <Divider />
          <PositionsPanel maxHeight={320} onOpenPanic={() => setPanicOpen(true)} />
        </View>
      </ScrollView>

      <PanicCloseSheet visible={panicOpen} onClose={() => setPanicOpen(false)} symbolFilter={symbol} />

      {toast ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: theme.hitTargets.tabBarBottom + theme.spacing[3],
            left: theme.spacing[4],
            right: theme.spacing[4],
            padding: theme.spacing[3],
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.bg.secondary,
            borderWidth: 1,
            borderColor: theme.colors.border.primary,
          }}
        >
          <Text variant="bodyMd" align="center">{toast}</Text>
        </View>
      ) : null}

      {/* Leverage picker */}
      <Modal visible={leverageModalOpen} transparent animationType="slide" onRequestClose={() => setLeverageModalOpen(false)}>
        <Pressable onPress={() => setLeverageModalOpen(false)} style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' }}>
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl,
              padding: theme.spacing[5], paddingBottom: theme.spacing[8],
              borderWidth: 1, borderColor: theme.colors.border.primary, gap: theme.spacing[3],
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="bodyLg" weight="bold">Account leverage</Text>
              <Text variant="bodyMd" tone="tertiary">Max 1:{levMax}</Text>
            </View>
            <Text variant="body" tone="secondary">Applies to this account. Higher leverage = lower margin required, higher risk.</Text>
            {levError ? <Text variant="body" tone="sell">{levError}</Text> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2], marginTop: theme.spacing[1] }}>
              {leverageOptions.map((l) => {
                const sel = l === leverage;
                const busy = savingLev === l;
                return (
                  <Pressable
                    key={l}
                    haptic="light"
                    onPress={() => { void applyLeverage(l); }}
                    disabled={savingLev != null}
                    style={({ pressed }) => ({
                      paddingVertical: theme.spacing[2], paddingHorizontal: theme.spacing[4],
                      borderRadius: theme.radius.pill, borderWidth: 1.5,
                      borderColor: sel ? theme.colors.buy : theme.colors.border.secondary,
                      backgroundColor: sel ? theme.colors.buyBg : pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                      opacity: savingLev != null && !busy ? 0.5 : 1,
                    })}
                  >
                    <Text variant="bodyMd" weight={sel ? 'bold' : 'medium'} style={sel ? { color: theme.colors.buy } : undefined}>
                      {busy ? '…' : `1:${l}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
    </GradientBackground>
  );
}

function InfoRow({ theme, label, value, onPress }: { theme: ReturnType<typeof useTheme>; label: string; value: string; onPress?: () => void }) {
  const body = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text variant="bodyMd" tone="secondary">{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1] }}>
        <Text variant="bodyMd" weight="medium">{value}</Text>
        {onPress ? <ChevronDown size={15} color={theme.colors.buy} strokeWidth={2.2} /> : null}
      </View>
    </View>
  );
  if (!onPress) return body;
  return <Pressable haptic="light" onPress={onPress}>{body}</Pressable>;
}
