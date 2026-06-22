import { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { RotateCcw } from 'lucide-react-native';
import { Text, Field, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { useAccountsStore } from '@/stores/accountsStore';
import { useMarketDataStore } from '@/stores/marketDataStore';
import { instrumentsApi } from '@/lib/api/instruments';
import type { InstrumentInfo } from '@/types/market';
import { ProfileHeader } from './profile';

// --- Currency-aware pip / margin math (ported from web riskMath.ts) -------
// Account assumed USD. Quote=USD → pip value = pipSize*cs; base=USD → /price;
// cross pairs approximate via price.
function deriveBaseQuote(symbol: string, base?: string | null, quote?: string | null) {
  const sym = symbol.toUpperCase();
  const b = (base || (sym.length >= 6 ? sym.slice(0, 3) : '')).toUpperCase();
  const q = (quote || (sym.length >= 6 ? sym.slice(3, 6) : '')).toUpperCase();
  return { base: b, quote: q };
}
function usdPipValuePerLot(pipSize: number, contractSize: number, price: number, symbol: string, base?: string | null, quote?: string | null): number {
  const bq = deriveBaseQuote(symbol, base, quote);
  const raw = pipSize * contractSize;
  if (!bq.quote || bq.quote === 'USD') return raw;
  if (bq.base === 'USD' && price > 0) return raw / price;
  return price > 0 ? raw / price : raw;
}
function usdMarginPerLot(contractSize: number, price: number, symbol: string, leverage: number, base?: string | null, quote?: string | null): number {
  const lev = leverage > 0 ? leverage : 100;
  const bq = deriveBaseQuote(symbol, base, quote);
  if (bq.base === 'USD') return contractSize / lev;
  return (contractSize * price) / lev;
}

const toNum = (s: string): number => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

type CalcTab = 'margin' | 'pnl' | 'lotsize' | 'swap';
const TABS: { id: CalcTab; label: string }[] = [
  { id: 'margin', label: 'Margin' },
  { id: 'pnl', label: 'P&L' },
  { id: 'lotsize', label: 'Lot Size' },
  { id: 'swap', label: 'Swap' },
];

export default function RiskCalculatorScreen() {
  const theme = useTheme();
  const active = useAccountsStore((s) => s.active);
  const accounts = useAccountsStore((s) => s.accounts);
  const instruments = useMarketDataStore((s) => s.instruments);
  const setInstruments = useMarketDataStore((s) => s.setInstruments);
  const prices = useMarketDataStore((s) => s.prices);
  const selectedSymbol = useMarketDataStore((s) => s.selectedSymbol);

  const [tab, setTab] = useState<CalcTab>('margin');
  const [selectedAccountId, setSelectedAccountId] = useState(active?.id ?? '');
  const [symbol, setSymbol] = useState(selectedSymbol);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [lots, setLots] = useState('0.01');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [riskPercent, setRiskPercent] = useState('1');
  const [stopLoss, setStopLoss] = useState('');
  const [daysHeld, setDaysHeld] = useState('1');

  useEffect(() => {
    if (instruments.length === 0) instrumentsApi.list().then(setInstruments).catch(() => {});
  }, [instruments.length, setInstruments]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || active;
  const instrument: InstrumentInfo | undefined = useMemo(
    () => instruments.find((i) => i.symbol === symbol),
    [instruments, symbol],
  );

  const pipSize = instrument ? Number(instrument.pip_size) || 0.0001 : 0.0001;
  const contractSize = Number(instrument?.contract_size) || 100000;
  const base = instrument?.base_currency ?? null;
  const quote = instrument?.quote_currency ?? null;
  const digits = instrument?.digits ?? 5;
  const balance = selectedAccount?.balance ?? 10000;
  const accountLeverage = selectedAccount?.leverage ?? 100;
  const tick = prices[symbol];
  const livePrice = tick ? (side === 'buy' ? tick.ask : tick.bid) : 0;

  // ── Margin ──
  const marginResult = useMemo(() => {
    const ep = toNum(entryPrice) || livePrice;
    const lot = toNum(lots);
    if (!ep || !lot) return null;
    const perLot = usdMarginPerLot(contractSize, ep, symbol, accountLeverage, base, quote);
    return { margin: perLot * lot, ep, lot, lev: accountLeverage };
  }, [entryPrice, livePrice, lots, contractSize, symbol, accountLeverage, base, quote]);

  // ── P&L ──
  const pnlResult = useMemo(() => {
    const ep = toNum(entryPrice);
    const xp = toNum(exitPrice);
    const lot = toNum(lots);
    if (!ep || !xp || !lot) return null;
    const pips = side === 'buy' ? (xp - ep) / pipSize : (ep - xp) / pipSize;
    const pipVal = usdPipValuePerLot(pipSize, contractSize, ep, symbol, base, quote);
    return { pnl: lot * pips * pipVal, pips, pipVal };
  }, [entryPrice, exitPrice, lots, side, pipSize, contractSize, symbol, base, quote]);

  // ── Lot Size ──
  const lotResult = useMemo(() => {
    const ep = toNum(entryPrice) || livePrice;
    const sl = toNum(stopLoss);
    const rp = toNum(riskPercent);
    if (!ep || !sl || !rp || ep <= 0 || sl <= 0) return null;
    const riskAmt = balance * (rp / 100);
    const slDist = Math.abs(ep - sl);
    const slPips = slDist / pipSize;
    if (slPips <= 0) return null;
    const pipVal = usdPipValuePerLot(pipSize, contractSize, ep, symbol, base, quote);
    const denom = slPips * pipVal;
    const raw = denom > 0 ? riskAmt / denom : 0;
    return { lotSize: Math.max(0.01, parseFloat(raw.toFixed(2))), riskAmt, slPips, pipVal };
  }, [entryPrice, livePrice, stopLoss, riskPercent, balance, pipSize, contractSize, symbol, base, quote]);

  // ── Swap (approx 0.5 pip/day) ──
  const swapResult = useMemo(() => {
    const lot = toNum(lots);
    const days = parseInt(daysHeld, 10) || 1;
    if (!lot) return null;
    const px = livePrice || tick?.bid || 1;
    const pipVal = usdPipValuePerLot(pipSize, contractSize, px, symbol, base, quote);
    const dailySwap = lot * 0.5 * pipVal;
    return { dailySwap, totalSwap: dailySwap * days, days };
  }, [lots, daysHeld, livePrice, tick, pipSize, contractSize, symbol, base, quote]);

  const resultLabel =
    tab === 'margin' ? 'Required Margin' :
    tab === 'pnl' ? (pnlResult && pnlResult.pnl >= 0 ? 'Profit' : 'Loss') :
    tab === 'lotsize' ? 'Lot Size' : 'Est. Swap';

  const resultValue =
    tab === 'margin' ? (marginResult ? `$${marginResult.margin.toFixed(2)}` : '$0.00') :
    tab === 'pnl' ? (pnlResult ? `${pnlResult.pnl >= 0 ? '+' : '-'}$${Math.abs(pnlResult.pnl).toFixed(2)}` : '$0.00') :
    tab === 'lotsize' ? (lotResult ? lotResult.lotSize.toFixed(2) : '0.00') :
    (swapResult ? `$${swapResult.totalSwap.toFixed(2)}` : '$0.00');

  const resultTone =
    tab === 'pnl' && pnlResult ? (pnlResult.pnl >= 0 ? theme.colors.buy : '#FF5C5C') : theme.colors.buy;

  const resultDetails: { l: string; v: string }[] =
    tab === 'margin' && marginResult ? [
      { l: 'Lots', v: marginResult.lot.toFixed(2) },
      { l: 'Leverage', v: `1:${marginResult.lev}` },
      { l: 'Price', v: marginResult.ep.toFixed(digits) },
    ] :
    tab === 'pnl' && pnlResult ? [
      { l: 'Pips', v: pnlResult.pips.toFixed(1) },
      { l: 'Pip Value', v: `$${pnlResult.pipVal.toFixed(4)}` },
    ] :
    tab === 'lotsize' && lotResult ? [
      { l: 'Risk', v: `$${lotResult.riskAmt.toFixed(2)}` },
      { l: 'SL Pips', v: lotResult.slPips.toFixed(1) },
    ] :
    tab === 'swap' && swapResult ? [
      { l: 'Daily', v: `$${swapResult.dailySwap.toFixed(4)}` },
      { l: 'Days', v: String(swapResult.days) },
    ] : [];

  const reset = () => {
    setEntryPrice(''); setExitPrice(''); setLots('0.01');
    setStopLoss(''); setRiskPercent('1'); setDaysHeld('1');
  };

  const symbolOptions = useMemo(() => {
    const list = instruments.length > 0 ? instruments.map((i) => i.symbol) : [symbol];
    return Array.from(new Set([symbol, ...list])).slice(0, 30);
  }, [instruments, symbol]);

  const chip = (sel: boolean) => ({
    paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.pill,
    backgroundColor: sel ? theme.colors.bg.active : theme.colors.bg.secondary,
    borderWidth: 1, borderColor: sel ? theme.colors.border.accent : theme.colors.border.primary,
  });

  const readonlyBox = {
    borderRadius: theme.radius.md, paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[3],
    backgroundColor: theme.colors.bg.secondary, borderWidth: 1, borderColor: theme.colors.border.primary,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Risk calculator' }} />
      <ProfileHeader title="Risk calculator" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[2], paddingBottom: theme.spacing[8], gap: theme.spacing[3] }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tabs */}
          <View style={{ flexDirection: 'row', gap: 4, backgroundColor: theme.colors.bg.secondary, borderRadius: theme.radius.md, padding: 4 }}>
            {TABS.map((t) => {
              const sel = tab === t.id;
              return (
                <Pressable key={t.id} haptic="light" onPress={() => setTab(t.id)}
                  style={{ flex: 1, paddingVertical: theme.spacing[2], borderRadius: theme.radius.sm, alignItems: 'center', backgroundColor: sel ? theme.colors.buy : 'transparent' }}>
                  <Text variant="labelXs" weight="bold" style={{ color: sel ? '#FFFFFF' : theme.colors.text.tertiary }}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Account selector */}
          {accounts.length > 0 ? (
            <>
              <Text variant="label" tone="secondary">Account</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing[2] }}>
                {accounts.map((a) => {
                  const sel = a.id === (selectedAccount?.id ?? '');
                  return (
                    <Pressable key={a.id} haptic="light" onPress={() => setSelectedAccountId(a.id)} style={chip(sel)}>
                      <Text variant="bodyMd" weight={sel ? 'bold' : 'regular'}>#{a.account_number}</Text>
                      <Text variant="labelXs" tone="tertiary">${a.balance.toFixed(2)}{a.is_demo ? ' · D' : ''}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          {/* Direction — all tabs */}
          {(tab === 'margin' || tab === 'pnl' || tab === 'lotsize' || tab === 'swap') ? (
            <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
              {(['buy', 'sell'] as const).map((s) => (
                <Pressable key={s} haptic="light" onPress={() => setSide(s)}
                  style={{ flex: 1, paddingVertical: theme.spacing[3], borderRadius: theme.radius.md, alignItems: 'center',
                    backgroundColor: side === s ? (s === 'buy' ? theme.colors.buyBg : 'rgba(255,92,92,0.12)') : theme.colors.bg.secondary,
                    borderWidth: 1, borderColor: side === s ? (s === 'buy' ? theme.colors.buy : '#FF5C5C') : theme.colors.border.primary }}>
                  <Text variant="bodyMd" weight="bold" style={{ color: s === 'buy' ? theme.colors.buy : '#FF5C5C' }}>{s.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* Account balance — lot size */}
          {tab === 'lotsize' ? (
            <View>
              <Text variant="label" tone="secondary">Account balance</Text>
              <View style={[readonlyBox, { marginTop: 4 }]}>
                <Text variant="num" weight="bold" tone="accent">${balance.toFixed(2)}</Text>
              </View>
            </View>
          ) : null}

          {/* Instrument */}
          <Text variant="label" tone="secondary">Instrument</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing[2] }}>
            {symbolOptions.map((sym) => (
              <Pressable key={sym} haptic="light" onPress={() => setSymbol(sym)} style={chip(sym === symbol)}>
                <Text variant="bodyMd" weight={sym === symbol ? 'bold' : 'regular'}>{sym}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Entry price */}
          <Field label="Entry price" value={entryPrice} onChangeText={setEntryPrice} keyboardType="decimal-pad" placeholder={livePrice ? livePrice.toFixed(digits) : '0.00'} />

          {/* Exit price — P&L */}
          {tab === 'pnl' ? (
            <Field label="Exit price" value={exitPrice} onChangeText={setExitPrice} keyboardType="decimal-pad" placeholder="0.00" />
          ) : null}

          {/* Margin: leverage (read-only) + lots */}
          {tab === 'margin' ? (
            <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Text variant="label" tone="secondary">Leverage</Text>
                <View style={[readonlyBox, { marginTop: 4 }]}>
                  <Text variant="num" weight="bold">1:{accountLeverage}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Lot size" value={lots} onChangeText={setLots} keyboardType="decimal-pad" placeholder="0.01" />
              </View>
            </View>
          ) : null}

          {/* P&L / Swap: lots */}
          {tab === 'pnl' ? <Field label="Lot size" value={lots} onChangeText={setLots} keyboardType="decimal-pad" placeholder="0.01" /> : null}

          {/* Lot size: risk % + SL */}
          {tab === 'lotsize' ? (
            <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Field label="Risk %" value={riskPercent} onChangeText={setRiskPercent} keyboardType="decimal-pad" placeholder="1" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Stop loss price" value={stopLoss} onChangeText={setStopLoss} keyboardType="decimal-pad" placeholder="0.00" />
              </View>
            </View>
          ) : null}

          {/* Swap: lots + days */}
          {tab === 'swap' ? (
            <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Field label="Lot size" value={lots} onChangeText={setLots} keyboardType="decimal-pad" placeholder="0.01" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Days held" value={daysHeld} onChangeText={setDaysHeld} keyboardType="number-pad" placeholder="1" />
              </View>
            </View>
          ) : null}

          {/* Use live price */}
          <Pressable haptic="light" onPress={() => { if (!entryPrice && livePrice > 0) setEntryPrice(livePrice.toFixed(digits)); }}
            style={{ paddingVertical: theme.spacing[3], borderRadius: theme.radius.md, alignItems: 'center', backgroundColor: theme.colors.bg.secondary, borderWidth: 1, borderColor: theme.colors.border.primary }}>
            <Text variant="bodyMd" weight="semibold" tone="accent">Use live price{livePrice ? ` (${livePrice.toFixed(digits)})` : ''}</Text>
          </Pressable>

          {/* Result panel */}
          <View style={{ borderRadius: theme.radius.lg, padding: theme.spacing[5], alignItems: 'center', backgroundColor: theme.colors.buyBg, borderWidth: 1, borderColor: theme.colors.border.accent }}>
            <Text variant="labelXs" tone="secondary">{resultLabel.toUpperCase()}</Text>
            <Text variant="numXxl" weight="bold" style={{ color: resultTone, marginTop: 4 }}>{resultValue}</Text>
            {resultDetails.length > 0 ? (
              <View style={{ width: '100%', marginTop: theme.spacing[3], gap: 6 }}>
                {resultDetails.map((d) => (
                  <View key={d.l} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="labelXs" tone="tertiary">{d.l}</Text>
                    <Text variant="labelXs" weight="semibold" tone="secondary">{d.v}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <Pressable haptic="light" onPress={reset} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing[2], paddingVertical: theme.spacing[2] }}>
            <RotateCcw size={14} color={theme.colors.text.tertiary} />
            <Text variant="body" tone="tertiary">Reset</Text>
          </Pressable>

          <Text variant="body" tone="tertiary" align="center">
            Approximate values (USD account). Cross-currency pairs and swap are estimated — indicative, not a quote.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
