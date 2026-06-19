import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths,
} from 'date-fns';
import {
  BookOpen, Wallet, DollarSign, TrendingUp, BarChart3, Info, PieChart,
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Target, Activity, LineChart,
} from 'lucide-react-native';
import { Text, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { EquityCurve } from '@/charts/EquityCurve';
import type { CalendarDayCell, TradingDashboardData } from './buildDashboard';

const RED = '#FF5C5C';

// Cent accounts show money in ¢ (USD value ×100); standard in $.
function fmtUsdRaw(n: number, isCent: boolean): string {
  if (isCent) {
    return `¢${(n * 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}

function fmtCompactRaw(n: number, isCent: boolean): string {
  const v = isCent ? n * 100 : n;
  const sym = isCent ? '¢' : '$';
  const sign = v >= 0 ? '+' : '−';
  const a = Math.abs(v);
  if (a >= 1000) return `${sign}${sym}${(a / 1000).toFixed(1)}K`;
  return `${sign}${sym}${a.toFixed(0)}`;
}

/** SVG progress ring (rotated so it starts at the top). */
function Ring({ value, max, size = 96, stroke = 6, color }: {
  value: number; max: number; size?: number; stroke?: number; color: string;
}) {
  const theme = useTheme();
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, max > 0 ? value / max : 0);
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={theme.colors.border.primary} strokeWidth={stroke} />
      <Circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`}
      />
    </Svg>
  );
}

function RingGauge({ value, max, label, sub, color }: {
  value: number; max: number; label: string; sub: string; color: string;
}) {
  const size = 96;
  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Ring value={value} max={max} size={size} color={color} />
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text variant="numLg" weight="bold">{label}</Text>
          <Text variant="labelXs" tone="tertiary" style={{ marginTop: 2, textAlign: 'center' }}>{sub}</Text>
        </View>
      </View>
    </View>
  );
}

function ScoreDonut({ score }: { score: number }) {
  const size = 120;
  return (
    <View style={{ width: size, height: size, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
      <Ring value={Math.min(100, Math.max(0, score))} max={100} size={size} stroke={10} color="#FFAA00" />
      <View style={{ position: 'absolute' }}>
        <Text variant="numXxl" weight="bold">{score}</Text>
      </View>
    </View>
  );
}

export function TradingJournal({ data, isCent = false }: { data: TradingDashboardData; isCent?: boolean }) {
  const theme = useTheme();
  const NEON = theme.colors.buy;
  const j = data.journal;
  const s = data.calendar.summary;
  // Cent-aware money formatters (¢ ×100 for cent accounts, else $).
  const fmtUsd = (n: number) => fmtUsdRaw(n, isCent);
  const fmtCompactSigned = (n: number) => fmtCompactRaw(n, isCent);

  const card = {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.bg.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  } as const;

  const [calMonth, setCalMonth] = useState(() => parseISO(`${data.calendar.defaultMonth}-01`));
  const [calView, setCalView] = useState<'usd' | 'pct' | 'r' | 'trades'>('usd');

  const dayMap = useMemo(() => {
    const m = new Map<string, CalendarDayCell>();
    data.calendar.days.forEach((c) => m.set(c.date, c));
    return m;
  }, [data.calendar.days]);

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(calMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(calMonth), { weekStartsOn: 0 });
    const allDays = eachDayOfInterval({ start, end });
    const rows: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) rows.push(allDays.slice(i, i + 7));
    return rows;
  }, [calMonth]);

  const weekTotals = useMemo(() => weeks.map((row) => {
    let sum = 0; let n = 0;
    for (const dt of row) {
      if (!isSameMonth(dt, calMonth)) continue;
      const cell = dayMap.get(format(dt, 'yyyy-MM-dd'));
      if (cell?.pnlUsd != null) { sum += cell.pnlUsd; n += 1; }
    }
    return { sum, n };
  }), [weeks, calMonth, dayMap]);

  const equityPoints = useMemo(
    () => data.equity.map((p) => ({ t: p.date, v: p.equityUsd })),
    [data.equity],
  );

  const cellValue = (cell: CalendarDayCell): string => {
    if (calView === 'usd' && cell.pnlUsd != null) return fmtCompactSigned(cell.pnlUsd);
    if (calView === 'trades' && cell.trades != null) return `${cell.trades}t`;
    if (calView === 'pct' && cell.pnlUsd != null) return `${(cell.pnlUsd / 100).toFixed(1)}%`;
    if (calView === 'r' && cell.rMultiple != null) return `${cell.rMultiple}R`;
    return '';
  };

  return (
    <View style={{ gap: theme.spacing[5] }}>
      {/* ——— Header ——— */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
        <View style={{ width: 40, height: 40, borderRadius: theme.radius.md, backgroundColor: theme.colors.buyBg, borderWidth: 1, borderColor: theme.colors.border.accent, alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={20} color={NEON} strokeWidth={2} />
        </View>
        <Text variant="h2" weight="bold">Trading Journal</Text>
      </View>

      {/* ——— Balance / Equity ——— */}
      <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
        <View style={[card, { flex: 1, padding: theme.spacing[4] }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text variant="labelXs" tone="tertiary">● BALANCE</Text>
              <Text variant="numXl" weight="bold" style={{ marginTop: 4 }}>{fmtUsd(j.balance)}</Text>
            </View>
            <View style={{ width: 36, height: 36, borderRadius: theme.radius.pill, backgroundColor: theme.colors.bg.tertiary, alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={18} color={NEON} strokeWidth={2} />
            </View>
          </View>
        </View>
        <View style={[card, { flex: 1, padding: theme.spacing[4] }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text variant="labelXs" tone="tertiary">● EQUITY</Text>
              <Text variant="numXl" weight="bold" style={{ marginTop: 4 }}>{fmtUsd(j.equity)}</Text>
              {(j.credit || 0) > 0 ? (
                <Text variant="labelXs" style={{ color: theme.colors.warning, marginTop: 4 }}>
                  incl. {fmtUsd(j.credit || 0)} credit
                </Text>
              ) : null}
            </View>
            <View style={{ width: 36, height: 36, borderRadius: theme.radius.pill, backgroundColor: theme.colors.bg.tertiary, alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={18} color={NEON} strokeWidth={2} />
            </View>
          </View>
        </View>
      </View>

      {/* ——— 4 stat cards ——— */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[3] }}>
        {[
          { label: 'NET P&L', Icon: DollarSign, value: fmtCompactSigned(j.netPl), color: j.netPl >= 0 ? NEON : RED, sub: `${j.netPlTradeCount} trades` },
          { label: 'PROFIT FACTOR', Icon: TrendingUp, value: String(j.profitFactor), color: NEON, sub: j.profitFactorNote },
          { label: 'LOTS TRADED', Icon: BarChart3, value: j.lotsTraded.toFixed(2), color: theme.colors.text.primary, sub: `${j.totalTrades} trades` },
          { label: 'TOTAL TRADES', Icon: BarChart3, value: String(j.totalTrades), color: theme.colors.text.primary, sub: `${j.wins} win, ${j.losses} losses` },
        ].map((m) => (
          <View key={m.label} style={[card, { width: '47.5%', flexGrow: 1, padding: theme.spacing[3] }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <m.Icon size={13} color={theme.colors.text.tertiary} strokeWidth={2} />
              <Text variant="labelXs" tone="tertiary">{m.label}</Text>
            </View>
            <Text variant="numLg" weight="bold" style={{ color: m.color }}>{m.value}</Text>
            <Text variant="labelXs" tone="tertiary" style={{ marginTop: 2 }}>{m.sub}</Text>
          </View>
        ))}
      </View>

      {/* ——— Current streak + Account stats ——— */}
      <View style={[card, { padding: theme.spacing[4] }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing[3] }}>
          <Text variant="labelXs" tone="tertiary">CURRENT STREAK</Text>
          <Info size={13} color={theme.colors.text.tertiary} strokeWidth={2} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <RingGauge value={j.streakDays} max={7} label={String(j.streakDays)} sub={`Days / ${j.streakDaysNote}`} color={NEON} />
          <RingGauge value={j.streakTrades} max={10} label={String(j.streakTrades)} sub={`Trades / ${j.streakTradesNote}`} color={NEON} />
        </View>
      </View>

      <View style={[card, { padding: theme.spacing[4] }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing[3] }}>
          <PieChart size={16} color={NEON} strokeWidth={2} />
          <Text variant="bodyMd" weight="semibold">Account stats</Text>
        </View>
        {([
          ['Free margin', fmtUsd(j.freeMargin)],
          ['Used margin', fmtUsd(j.usedMargin)],
          ['Margin level', j.marginLevel ?? 'N/A'],
          ['Currency', j.currency],
        ] as const).map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
            <Text variant="bodyMd" tone="tertiary">{k}</Text>
            <Text variant="bodyMd" weight="medium">{v}</Text>
          </View>
        ))}
      </View>

      {/* ——— Trading calendar ——— */}
      <View style={[card, { overflow: 'hidden' }]}>
        <View style={{ padding: theme.spacing[3], borderBottomWidth: 1, borderBottomColor: theme.colors.border.primary, gap: theme.spacing[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CalendarIcon size={18} color={NEON} strokeWidth={2} />
              <Text variant="bodyLg" weight="bold">Trading calendar</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {([['usd', '$'], ['pct', '%'], ['r', 'R'], ['trades', 'T']] as const).map(([id, lbl]) => {
                const sel = calView === id;
                return (
                  <Pressable key={id} haptic="light" onPress={() => setCalView(id)}
                    style={{ width: 30, height: 30, borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? NEON : theme.colors.bg.tertiary }}>
                    <Text variant="labelXs" weight="bold" style={{ color: sel ? '#FFFFFF' : theme.colors.text.tertiary }}>{lbl}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing[3] }}>
            <Pressable haptic="light" onPress={() => setCalMonth(subMonths(calMonth, 1))} style={{ padding: 6, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border.primary }}>
              <ChevronLeft size={16} color={theme.colors.text.secondary} />
            </Pressable>
            <Text variant="bodyMd" weight="semibold" style={{ minWidth: 96, textAlign: 'center' }}>{format(calMonth, 'MMM yyyy')}</Text>
            <Pressable haptic="light" onPress={() => setCalMonth(addMonths(calMonth, 1))} style={{ padding: 6, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border.primary }}>
              <ChevronRight size={16} color={theme.colors.text.secondary} />
            </Pressable>
            {!isSameMonth(calMonth, new Date()) ? (
              <Pressable haptic="light" onPress={() => setCalMonth(startOfMonth(new Date()))} style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: theme.radius.sm, backgroundColor: theme.colors.buyBg, borderWidth: 1, borderColor: theme.colors.border.accent }}>
                <Text variant="labelXs" weight="semibold" tone="accent">Today</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Monthly summary strip */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing[3], paddingHorizontal: theme.spacing[3], paddingVertical: theme.spacing[2], borderBottomWidth: 1, borderBottomColor: theme.colors.border.primary }}>
          <Text variant="labelXs" weight="semibold" tone="accent">Monthly P&L {fmtCompactSigned(s.monthlyPnlUsd)}</Text>
          <Text variant="labelXs" tone="tertiary">Active <Text variant="labelXs">{s.activeDays}</Text></Text>
          <Text variant="labelXs" tone="tertiary">Trades <Text variant="labelXs">{s.trades}</Text></Text>
          <Text variant="labelXs" tone="tertiary">Lots <Text variant="labelXs">{s.lots.toFixed(2)}</Text></Text>
          <Text variant="labelXs" style={{ marginLeft: 'auto', color: NEON }}>{s.wins}W <Text variant="labelXs" style={{ color: RED }}>{s.losses}L</Text></Text>
        </View>

        {/* Grid */}
        <View style={{ padding: theme.spacing[2] }}>
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S', 'Wk'].map((h, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="labelXs" tone="tertiary" weight="semibold">{h}</Text>
              </View>
            ))}
          </View>
          {weeks.map((row, wi) => (
            <View key={wi} style={{ flexDirection: 'row', marginBottom: 3 }}>
              {row.map((dt) => {
                const inMonth = isSameMonth(dt, calMonth);
                const cell = dayMap.get(format(dt, 'yyyy-MM-dd'));
                const isWin = cell?.kind === 'win';
                const isLoss = cell?.kind === 'loss';
                const val = cell ? cellValue(cell) : '';
                return (
                  <View key={dt.toISOString()} style={{
                    flex: 1, minHeight: 46, margin: 1.5, borderRadius: theme.radius.sm, padding: 3,
                    borderWidth: 1,
                    opacity: inMonth ? 1 : 0.25,
                    borderColor: !inMonth ? 'transparent' : isWin ? theme.colors.border.accent : isLoss ? 'rgba(255,92,92,0.5)' : theme.colors.border.primary,
                    backgroundColor: !inMonth ? 'transparent' : isWin ? theme.colors.buyBg : isLoss ? 'rgba(255,92,92,0.12)' : theme.colors.bg.tertiary,
                  }}>
                    <Text variant="labelXs" tone="tertiary" style={{ fontSize: 9 }}>{format(dt, 'd')}</Text>
                    {inMonth && val ? (
                      <Text weight="bold" style={{ fontSize: 9, color: isWin ? NEON : RED, marginTop: 1 }}>{val}</Text>
                    ) : null}
                  </View>
                );
              })}
              <View style={{ flex: 1, minHeight: 46, margin: 1.5, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border.primary, backgroundColor: theme.colors.bg.tertiary, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="labelXs" tone="tertiary" style={{ fontSize: 9 }}>
                  {(weekTotals[wi]?.n ?? 0) > 0 ? fmtCompactSigned(weekTotals[wi]?.sum ?? 0) : '—'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ——— Trade win % ——— */}
      <View style={[card, { padding: theme.spacing[4] }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing[3] }}>
          <Target size={16} color={NEON} strokeWidth={2} />
          <Text variant="bodyMd" weight="semibold">Trade win %</Text>
        </View>
        <Text variant="numXxl" weight="bold" style={{ color: data.stats.tradeWinPct >= 50 ? NEON : RED }}>
          {data.stats.tradeWinPct.toFixed(1)}%
        </Text>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,92,92,0.4)', overflow: 'hidden', marginTop: theme.spacing[3] }}>
          <View style={{ height: '100%', width: `${Math.min(100, data.stats.tradeWinPct)}%`, backgroundColor: NEON }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text variant="labelXs" style={{ color: NEON }}>{j.wins} won</Text>
          <Text variant="labelXs" style={{ color: RED }}>{j.losses} lost</Text>
        </View>
      </View>

      {/* ——— Performance ——— */}
      <View style={[card, { padding: theme.spacing[4] }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing[3] }}>
          <BarChart3 size={16} color={NEON} strokeWidth={2} />
          <Text variant="bodyMd" weight="semibold">Performance</Text>
        </View>
        {([
          ['Profit factor', data.stats.profitFactor.toFixed(2), NEON],
          ['Avg win', fmtUsd(data.stats.avgWinUsd), NEON],
          ['Avg loss', fmtUsd(-data.stats.avgLossUsd), RED],
          ['Period P&L', fmtCompactSigned(data.stats.periodPnlUsd), data.stats.periodPnlUsd >= 0 ? NEON : RED],
          ['Total trades', String(data.stats.totalTrades), theme.colors.text.primary],
        ] as const).map(([k, v, c]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
            <Text variant="bodyMd" tone="tertiary">{k}</Text>
            <Text variant="bodyMd" weight="semibold" style={{ color: c }}>{v}</Text>
          </View>
        ))}
      </View>

      {/* ——— Equity growth ——— */}
      <View style={[card, { padding: theme.spacing[4] }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing[3] }}>
          <LineChart size={18} color={NEON} strokeWidth={2} />
          <Text variant="bodyLg" weight="bold">Equity growth</Text>
        </View>
        {equityPoints.length > 1 ? (
          <EquityCurve points={equityPoints} height={160} />
        ) : (
          <Text variant="bodyMd" tone="tertiary" style={{ paddingVertical: theme.spacing[4], textAlign: 'center' }}>Not enough data yet.</Text>
        )}
      </View>

      {/* ——— Trading statistics ——— */}
      <View style={[card, { padding: theme.spacing[4] }]}>
        <Text variant="bodyMd" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>Trading statistics</Text>
        {([
          ['Risk–reward', data.stats.riskReward, NEON],
          ['Expectancy', `${data.stats.expectancyUsd >= 0 ? '+' : ''}${fmtUsd(data.stats.expectancyUsd)}`, data.stats.expectancyUsd >= 0 ? NEON : RED],
          ['Best streak', data.stats.bestStreak, NEON],
          ['Worst streak', data.stats.worstStreak, RED],
          ['Best trade', fmtUsd(data.stats.bestTradeUsd), NEON],
          ['Worst trade', fmtUsd(data.stats.worstTradeUsd), RED],
        ] as const).map(([k, v, c]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
            <Text variant="bodyMd" tone="tertiary">{k}</Text>
            <Text variant="bodyMd" weight="medium" style={{ color: c }}>{v}</Text>
          </View>
        ))}
      </View>

      {/* ——— Crucial score ——— */}
      <View style={[card, { padding: theme.spacing[4] }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing[3] }}>
          <Activity size={16} color="#FFAA00" strokeWidth={2} />
          <Text variant="bodyMd" weight="semibold">Crucial score</Text>
        </View>
        <ScoreDonut score={data.crucialScore} />
        <Text variant="labelXs" tone="tertiary" style={{ textAlign: 'center', marginTop: theme.spacing[3] }}>
          Win rate · Profit factor · Risk–reward · Expectancy
        </Text>
      </View>
    </View>
  );
}
