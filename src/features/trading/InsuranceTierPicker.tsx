import { useEffect, useRef, useState } from 'react';
import { View, Switch, ActivityIndicator } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { Text, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { insuranceApi, insuranceTierLabel, type InsuranceTierQuote } from '@/lib/api/earn';
import { fmtAccountMoney } from '@/lib/money';

interface Props {
  accountId: string;
  /** Cent account → show fees/caps/refunds in ¢ (value ×100). */
  isCent?: boolean;
  symbol: string;
  /** Quote direction. Market dual-button has no pre-chosen side, so the ticket
   *  passes a default ('buy'); the fee shown is an estimate and the real policy
   *  binds to whichever position opens. */
  side: 'buy' | 'sell';
  lots: number;
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
  /** Fires with the chosen { tier, fee } or null (off / no quote). */
  onSelect: (sel: { tier: string; fee: number } | null) => void;
}

/** Map a backend quote-rejection code to the same copy the web shows. */
function quoteErrorLabel(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('insurance_disabled_for_account_type')) return 'Insurance is not available for this account type.';
  if (m.includes('insurance_disabled')) return 'Insurance is currently disabled.';
  if (m.includes('news_blackout')) return 'Insurance is paused during the active news window.';
  if (m.includes('vol_too_low')) return 'Volatility too low — insurance unavailable for this instrument.';
  if (m.includes('vol_too_high')) return 'Volatility too high — insurance unavailable right now.';
  if (m.includes('hour_blackout')) return 'Insurance is paused during this hour window.';
  if (m.includes('max_lots_exceeded')) {
    const mm = raw.match(/max_lots_exceeded:?\s*([\d.]+)/i);
    return mm
      ? `This trade is too large to insure. Max insurable size is ${mm[1]} lots — reduce volume to insure it.`
      : 'This trade is too large to insure — reduce volume.';
  }
  return 'Could not get a quote — try again.';
}

/** "Insure this trade" toggle + tier picker for the order ticket. Mirrors the
 *  web InsuranceTierPicker: debounced quote, auto-pick cheapest, fee note. */
export function InsuranceTierPicker({ accountId, isCent = false, symbol, side, lots, leverage, stopLoss, takeProfit, onSelect }: Props) {
  const theme = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [quotes, setQuotes] = useState<InsuranceTierQuote[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState('');

  // Keep onSelect out of effect deps so it doesn't retrigger fetches.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Debounced quote fetch — only while enabled with valid params.
  useEffect(() => {
    if (!enabled || !accountId || !symbol || !(lots > 0)) {
      setQuotes(null);
      setError(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      insuranceApi
        .quote({
          account_id: accountId,
          symbol,
          side,
          lots,
          ...(leverage != null ? { leverage } : {}),
          ...(stopLoss != null ? { stop_loss: stopLoss } : {}),
          ...(takeProfit != null ? { take_profit: takeProfit } : {}),
        })
        .then((q) => { setQuotes(q); setError(null); })
        .catch((e: unknown) => { setQuotes(null); setError(quoteErrorLabel(e instanceof Error ? e.message : '')); })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [enabled, accountId, symbol, side, lots, leverage, stopLoss, takeProfit]);

  // Auto-pick cheapest + report selection upward.
  useEffect(() => {
    if (!enabled || !quotes || quotes.length === 0) {
      onSelectRef.current(null);
      return;
    }
    const chosen = tier ? quotes.find((q) => q.tier === tier) : null;
    const eff = chosen ?? [...quotes].sort((a, b) => a.fee - b.fee)[0];
    if (!eff) { onSelectRef.current(null); return; }
    if (!tier) setTier(eff.tier);
    onSelectRef.current({ tier: eff.tier, fee: eff.fee });
  }, [enabled, quotes, tier]);

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: enabled ? theme.colors.border.accent : theme.colors.border.primary,
        backgroundColor: theme.colors.bg.secondary,
        borderRadius: theme.radius.md,
        padding: theme.spacing[3],
        gap: theme.spacing[2],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
        <ShieldCheck size={18} color={enabled ? theme.colors.buy : theme.colors.text.secondary} strokeWidth={2} />
        <Text variant="bodyMd" weight="medium">Insure this trade</Text>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text variant="labelXs" tone="tertiary">OPTIONAL</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={(v) => { setEnabled(v); if (!v) { setTier(''); setQuotes(null); setError(null); } }}
          trackColor={{ true: theme.colors.buy, false: theme.colors.bg.tertiary }}
          thumbColor="#FFFFFF"
        />
      </View>

      {enabled ? (
        loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], paddingVertical: theme.spacing[1] }}>
            <ActivityIndicator size="small" color={theme.colors.buy} />
            <Text variant="body" tone="tertiary">Calculating quotes…</Text>
          </View>
        ) : error ? (
          <Text variant="body" tone="sell">{error}</Text>
        ) : quotes && quotes.length > 0 ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] }}>
              {quotes.map((q) => {
                const sel = q.tier === tier;
                return (
                  <Pressable
                    key={q.tier}
                    onPress={() => setTier(q.tier)}
                    haptic="light"
                    style={({ pressed }) => ({
                      minWidth: 108,
                      flexGrow: 1,
                      padding: theme.spacing[2],
                      borderRadius: theme.radius.md,
                      borderWidth: 1,
                      borderColor: sel ? theme.colors.buy : theme.colors.border.primary,
                      backgroundColor: sel ? theme.colors.buyBg : pressed ? theme.colors.bg.hover : theme.colors.bg.input,
                      gap: 2,
                    })}
                  >
                    <Text variant="labelXs" tone="tertiary">{insuranceTierLabel(q.tier)}</Text>
                    <Text variant="numLg" weight="bold" tone={sel ? 'accent' : 'primary'}>{fmtAccountMoney(q.fee, isCent)}</Text>
                    <Text variant="caption" tone="buy" weight="semibold">{q.coverage_pct.toFixed(0)}% covered</Text>
                    <Text variant="caption" tone="tertiary">Max {fmtAccountMoney(q.max_cap, isCent, { decimals: 0 })}</Text>
                    {q.estimated_refund > 0 ? (
                      <Text variant="caption" tone="secondary">~{fmtAccountMoney(q.estimated_refund, isCent)} if SL hits</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            {tier ? (
              <Text variant="caption" tone="tertiary">
                The fee will be charged from your main wallet after the order opens.
              </Text>
            ) : null}
          </>
        ) : (
          <Text variant="body" tone="tertiary">No insurance tiers available for this trade.</Text>
        )
      ) : null}
    </View>
  );
}
