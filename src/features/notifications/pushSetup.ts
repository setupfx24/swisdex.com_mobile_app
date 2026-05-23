// Scaffolded push-notification setup — DISABLED.
//
// CLAUDE.md / audit: backend currently has NO FCM/APNs registration
// endpoint. Until that lands, we poll for the unread badge via
// notificationsStore.start() and surface alerts in-app only.
//
// When the backend ships POST /notifications/devices (or similar):
//   1) Flip PUSH_BACKEND_READY to true.
//   2) Implement registerDeviceToken to call the endpoint with the Expo
//      push token + platform.
//   3) Wire registerForPushNotificationsAsync into the app/_layout boot
//      after authStore.bootstrap() completes.
//
// Test in Expo Go: expo-notifications local notifications work in Expo Go
// for foreground display; push tokens require a development / production
// build (Expo Go can't get a real push token in SDK 53+).

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const PUSH_BACKEND_READY = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('trades', {
      name: 'Trade activity',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

/** No-op until the backend endpoint exists. */
export async function registerDeviceToken(_token: string): Promise<void> {
  if (!PUSH_BACKEND_READY) return;
  // TODO: POST /notifications/devices with { expo_token, platform }
}
