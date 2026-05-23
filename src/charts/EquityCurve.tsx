import { useMemo, useState, useCallback } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import { Canvas, Path, Skia, Line, vec } from '@shopify/react-native-skia';
import { useTheme } from '@/theme';
import type { EquityPoint } from '@/lib/api/portfolio';

interface Props {
  points: EquityPoint[];
  height?: number;
}

/** Skia line chart for the equity / balance curve. Single colour (accent
 *  green if rising, sell if falling over the window) with a faint fill
 *  underneath. No gridlines on the chart itself — keeps the visual quiet,
 *  matches CLAUDE.md "subtle, less than 200ms, no decoration on prices". */
export function EquityCurve({ points, height = 160 }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const drawn = useMemo(() => {
    if (points.length < 2 || width === 0) return null;
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of points) {
      if (p.v < lo) lo = p.v;
      if (p.v > hi) hi = p.v;
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    const padTop = 8;
    const padBottom = 8;
    const usableH = height - padTop - padBottom;
    const range = hi - lo;
    const stepX = width / (points.length - 1);

    const y = (v: number) => padTop + usableH - ((v - lo) / range) * usableH;

    const line = Skia.Path.Make();
    const area = Skia.Path.Make();
    points.forEach((p, i) => {
      const x = i * stepX;
      const yy = y(p.v);
      if (i === 0) {
        line.moveTo(x, yy);
        area.moveTo(x, height);
        area.lineTo(x, yy);
      } else {
        line.lineTo(x, yy);
        area.lineTo(x, yy);
      }
    });
    area.lineTo(width, height);
    area.close();

    const firstPoint = points[0]!;
    const lastPoint = points[points.length - 1]!;
    const rising = lastPoint.v >= firstPoint.v;
    return {
      line,
      area,
      color: rising ? theme.colors.buy : theme.colors.sell,
      fill: rising ? theme.colors.buyBg : theme.colors.sellBg,
      zeroY: lo < 0 && hi > 0 ? y(0) : null,
    };
  }, [points, width, height, theme]);

  return (
    <View style={{ height, width: '100%' }} onLayout={onLayout}>
      <Canvas style={{ flex: 1 }}>
        {drawn ? (
          <>
            <Path path={drawn.area} color={drawn.fill} />
            <Path path={drawn.line} style="stroke" strokeWidth={1.5} color={drawn.color} />
            {drawn.zeroY != null ? (
              <Line
                p1={vec(0, drawn.zeroY)}
                p2={vec(width, drawn.zeroY)}
                color={theme.colors.border.primary}
                strokeWidth={1}
              />
            ) : null}
          </>
        ) : null}
      </Canvas>
    </View>
  );
}
