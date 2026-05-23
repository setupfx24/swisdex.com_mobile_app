import { useMemo, useState, useCallback } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import { Canvas, Group, Rect, Line, vec } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { format } from 'date-fns';
import { Text, Num } from '@/ui';
import { useTheme } from '@/theme';
import type { Candle } from './types';

interface Props {
  candles: Candle[];
  digits: number;
}

/** Pure-Skia candlestick renderer. CLAUDE.md spec: "Black background,
 *  hairline grid, solid filled candle bodies, 1px wicks, no 3D effects,
 *  crosshair on long-press with price + time readout."
 *
 *  This v1 fits the most recent N candles in the visible canvas (no pan
 *  / zoom). Pan / zoom is a known follow-up — flagging in CHARTS_TODO. */
export function CandleChart({ candles, digits }: Props) {
  const theme = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [crosshairX, setCrosshairX] = useState<number | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - size.w) > 0.5 || Math.abs(height - size.h) > 0.5) {
      setSize({ w: width, h: height });
    }
  }, [size.w, size.h]);

  const visible = useMemo(() => {
    if (candles.length === 0 || size.w === 0) return [];
    // Fit at most candleCount = floor(w / minBarWidth); show the most recent.
    const minBarWidth = 4;
    const maxBars = Math.max(20, Math.min(candles.length, Math.floor(size.w / minBarWidth)));
    return candles.slice(-maxBars);
  }, [candles, size.w]);

  const layout = useMemo(() => {
    if (visible.length === 0 || size.w === 0 || size.h === 0) return null;
    const padTop = 8;
    const padBottom = 16;
    const padRight = 56; // right gutter for price-axis labels
    const chartW = size.w - padRight;
    const chartH = size.h - padTop - padBottom;
    const barWidth = chartW / visible.length;
    const bodyWidth = Math.max(1, barWidth * 0.7);

    let lo = Infinity;
    let hi = -Infinity;
    for (const c of visible) {
      if (c.low < lo) lo = c.low;
      if (c.high > hi) hi = c.high;
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) {
      // Degenerate range — pad symmetrically so we still render.
      const center = Number.isFinite(lo) ? lo : 0;
      lo = center - 1;
      hi = center + 1;
    }
    // Add 5% headroom top + bottom so the highest/lowest wicks don't kiss the edges.
    const span = hi - lo;
    lo -= span * 0.05;
    hi += span * 0.05;
    const range = hi - lo || 1;

    const y = (price: number) => padTop + chartH - ((price - lo) / range) * chartH;
    const x = (i: number) => i * barWidth + barWidth / 2;

    return { padTop, padBottom, padRight, chartW, chartH, barWidth, bodyWidth, lo, hi, range, x, y };
  }, [visible, size.w, size.h]);

  const gridLines = useMemo(() => {
    if (!layout) return [];
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const price = layout.lo + (layout.range * i) / steps;
      return { price, y: layout.y(price) };
    });
  }, [layout]);

  const long = Gesture.LongPress()
    .minDuration(150)
    .onStart((e) => setCrosshairX(e.x))
    .onTouchesMove((e) => {
      const first = e.allTouches[0];
      if (first) setCrosshairX(first.x);
    })
    .onFinalize(() => setCrosshairX(null))
    .runOnJS(true);

  const crosshairCandle = useMemo(() => {
    if (crosshairX == null || !layout) return null;
    const idx = Math.min(visible.length - 1, Math.max(0, Math.floor(crosshairX / layout.barWidth)));
    const candle = visible[idx];
    if (!candle) return null;
    return { idx, candle };
  }, [crosshairX, layout, visible]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg.base }} onLayout={onLayout}>
      <GestureDetector gesture={long}>
        <Canvas style={{ flex: 1 }}>
          {layout ? (
            <Group>
              {/* Hairline grid */}
              {gridLines.map((g, i) => (
                <Line
                  key={i}
                  p1={vec(0, g.y)}
                  p2={vec(layout.chartW, g.y)}
                  color={theme.colors.border.primary}
                  strokeWidth={1}
                />
              ))}
              {/* Candles */}
              {visible.map((c, i) => {
                const cx = layout.x(i);
                const wickX = cx;
                const bodyX = cx - layout.bodyWidth / 2;
                const yOpen = layout.y(c.open);
                const yClose = layout.y(c.close);
                const yHigh = layout.y(c.high);
                const yLow = layout.y(c.low);
                const bullish = c.close >= c.open;
                const color = bullish ? theme.colors.buy : theme.colors.sell;
                const bodyTop = Math.min(yOpen, yClose);
                const bodyHeight = Math.max(1, Math.abs(yOpen - yClose));
                return (
                  <Group key={c.time}>
                    <Line p1={vec(wickX, yHigh)} p2={vec(wickX, yLow)} color={color} strokeWidth={1} />
                    <Rect x={bodyX} y={bodyTop} width={layout.bodyWidth} height={bodyHeight} color={color} />
                  </Group>
                );
              })}
              {/* Crosshair vertical line */}
              {crosshairCandle ? (
                <Line
                  p1={vec(layout.x(crosshairCandle.idx), layout.padTop)}
                  p2={vec(layout.x(crosshairCandle.idx), layout.padTop + layout.chartH)}
                  color={theme.colors.text.tertiary}
                  strokeWidth={1}
                />
              ) : null}
            </Group>
          ) : null}
        </Canvas>
      </GestureDetector>

      {/* Right-axis price labels overlay (SVG/Text outside Skia for simpler
         theming + native text rendering). */}
      {layout ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: layout.padRight,
            paddingLeft: 4,
          }}
        >
          {gridLines.map((g, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                top: g.y - 7,
                right: 4,
              }}
            >
              <Num value={g.price} digits={digits} variant="labelXs" tone="tertiary" />
            </View>
          ))}
        </View>
      ) : null}

      {/* Crosshair readout pill (top-left of chart). */}
      {crosshairCandle ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            paddingHorizontal: theme.spacing[2],
            paddingVertical: theme.spacing[1],
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.bg.secondary,
            borderWidth: 1,
            borderColor: theme.colors.border.primary,
            flexDirection: 'row',
            gap: theme.spacing[2],
            alignItems: 'center',
          }}
        >
          <Text variant="labelXs" tone="tertiary">
            {format(new Date(crosshairCandle.candle.time * 1000), 'MMM d HH:mm')}
          </Text>
          <Num value={crosshairCandle.candle.close} digits={digits} variant="labelXs" tone="primary" />
        </View>
      ) : null}
    </View>
  );
}
