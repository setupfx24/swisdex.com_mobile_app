import { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** Override colour. Default: green if last >= first, red otherwise. */
  color?: string;
  strokeWidth?: number;
}

/** Tiny inline sparkline drawn with react-native-svg.
 *  Auto-coloured by direction (last vs first). Single-line, no fill —
 *  matches Vantage's compact watchlist row. */
export function Sparkline({ data, width = 64, height = 24, color, strokeWidth = 1.5 }: SparklineProps) {
  const theme = useTheme();
  const path = useMemo(() => {
    if (data.length < 2 || width === 0 || height === 0) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    const points = data.map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return points.join(' ');
  }, [data, width, height]);

  const stroke = color ?? (data.length >= 2 && (data[data.length - 1] ?? 0) >= (data[0] ?? 0)
    ? theme.colors.buy
    : theme.colors.sell);

  if (!path) return null;
  return (
    <Svg width={width} height={height}>
      <Path d={path} stroke={stroke} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
