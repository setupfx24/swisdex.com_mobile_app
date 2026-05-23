import { useCallback } from 'react';
import {
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
  type GestureResponderEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | null;

interface PressableProps extends Omit<RNPressableProps, 'onPress'> {
  onPress?: (event: GestureResponderEvent) => void;
  /** Haptic to fire on press. Defaults to 'light' for tappable surfaces;
   *  set to null to disable (e.g. on benign visual swaps that aren't a "click"). */
  haptic?: HapticType;
}

/** Pressable with built-in haptics — the entire app should use this rather
 *  than RN's Pressable so haptic feedback is consistent. CLAUDE.md: "subtle,
 *  less than 200ms transitions" — RN's default 50ms press-in is fine. */
export function Pressable({
  haptic = 'light',
  onPress,
  ...rest
}: PressableProps) {
  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      if (haptic) {
        switch (haptic) {
          case 'light':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'medium':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'heavy':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
          case 'success':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          case 'warning':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
          case 'error':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
        }
      }
      onPress?.(e);
    },
    [haptic, onPress],
  );

  return <RNPressable {...rest} onPress={handlePress} />;
}
