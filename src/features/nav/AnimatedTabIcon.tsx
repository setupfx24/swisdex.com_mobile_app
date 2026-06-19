import { useMemo } from 'react';
import LottieView from 'lottie-react-native';

type LottieSource = React.ComponentProps<typeof LottieView>['source'];

/** Lottie color arrays are [r,g,b,a] in 0..1. Convert a #RRGGBB hex. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

/** Recolor every fill/stroke in a Lottie doc to a single colour. The source
 *  JSONs are authored green; we retint at runtime so the icon follows the
 *  theme (accent-green when focused, grey when not) instead of baking colours. */
function walk(node: unknown, rgb: [number, number, number]): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, rgb);
    return;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if ((obj.ty === 'fl' || obj.ty === 'st') && obj.c && typeof obj.c === 'object') {
      const c = obj.c as Record<string, unknown>;
      c.k = [rgb[0], rgb[1], rgb[2], 1];
      delete c.x; // drop AE expressions — RN can't evaluate them anyway
    }
    for (const key of Object.keys(obj)) walk(obj[key], rgb);
  }
}

function tint(src: object, hex: string): LottieSource {
  const clone = JSON.parse(JSON.stringify(src));
  walk(clone, hexToRgb(hex));
  return clone as LottieSource;
}

interface Props {
  source: object;
  focused: boolean;
  activeColor: string;
  inactiveColor: string;
  size?: number;
}

/** Animated bottom-tab icon. Plays its Lottie on focus, sits on the first
 *  frame (grey) when inactive.
 *
 *  We drive playback with `autoPlay` + a focus-keyed `key` rather than an
 *  imperative ref.play(): on Expo Go / Android, calling play() right after a
 *  source swap races the native reload and often no-ops. Remounting with
 *  autoPlay={true} starts the animation reliably every time the tab focuses. */
export function AnimatedTabIcon({ source, focused, activeColor, inactiveColor, size = 28 }: Props) {
  const json = useMemo(
    () => tint(source, focused ? activeColor : inactiveColor),
    [source, focused, activeColor, inactiveColor],
  );

  return (
    <LottieView
      key={focused ? 'on' : 'off'}
      source={json}
      autoPlay={focused}
      loop={focused}
      style={{ width: size, height: size }}
    />
  );
}
