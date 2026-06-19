// Push-notification wiring (mobile side READY).
//
// IMPORTANT: expo-notifications is imported DYNAMICALLY and only in a real
// dev/production build. Expo Go (SDK 53+) removed remote push, and merely
// IMPORTING expo-notifications there runs its TokenAutoRegistration side
// effect, which logs the red "Use a development build" console error. By
// not importing the module in Expo Go at all, that error never appears.
//
// In a real build: requests permission → gets the Expo push token → POSTs it
// to the backend (POST /notifications/devices) → routes notification taps to
// the inbox. The backend register call is swallowed until that endpoint ships.

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import api from '@/lib/api/client';

// 'storeClient' === Expo Go. A dev/production build reports 'standalone'/'bare'.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

export const PUSH_BACKEND_READY = true;

let responseSub: { remove: () => void } | null = null;

/** Call once after the user is authenticated. No-op in Expo Go (expo-
 *  notifications is never even imported there, so no console error). */
export async function setupPushNotifications(): Promise<void> {
  if (IS_EXPO_GO) return;

  // Dynamic imports — these modules are only evaluated in a real build.
  const Notifications = await import('expo-notifications');
  const Device = await import('expo-device');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'SwisDex alerts',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  try {
    // EAS build injects the projectId into expoConfig.extra.eas — pass it
    // explicitly so getExpoPushTokenAsync never throws "No projectId found".
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    if (token?.data && PUSH_BACKEND_READY) {
      try {
        await api.post('/notifications/devices', { expo_token: token.data, platform: Platform.OS });
        console.log('[push] registered Expo token with backend:', token.data);
      } catch (e) {
        // Surface so it's visible in `adb logcat` — silent failure here was
        // why "no push" was undebuggable.
        console.warn('[push] backend device registration failed:', e);
      }
    } else {
      console.warn('[push] no Expo push token returned');
    }
  } catch (e) {
    // On Android this throws when Firebase/FCM is not configured
    // (missing google-services.json / FCM V1 key). Log the real cause.
    console.warn('[push] getExpoPushTokenAsync failed (FCM not configured?):', e);
  }

  if (!responseSub) {
    responseSub = Notifications.addNotificationResponseReceivedListener(() => {
      // Tapping a push opens the inbox (per-type deep-linking happens there).
      try { router.push('/inbox' as never); } catch { /* router not ready */ }
    });
  }
}

export function teardownPushNotifications(): void {
  responseSub?.remove();
  responseSub = null;
}
