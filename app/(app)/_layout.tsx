import { useEffect } from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useAccountsStore } from '@/stores/accountsStore';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { startTradeSync } from '@/lib/ws/tradeSync';
import { setupPushNotifications, teardownPushNotifications } from '@/features/notifications/pushSetup';

/** Stack for the authenticated surface — holds the tab group + any
 *  pushed screens (account detail, KYC, edit profile, etc.). Modal-style
 *  screens push over the tabs, matching the Twitter/Robinhood pattern. */
export default function AppLayout() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const loadAccounts = useAccountsStore((s) => s.load);
  const accountsLoaded = useAccountsStore((s) => s.accounts.length > 0);

  // Fetch the user's accounts once when authentication completes. Account
  // switcher needs them everywhere; loading them here avoids each screen
  // re-fetching on first visit.
  useEffect(() => {
    if (status === 'authenticated' && user && !accountsLoaded) {
      void loadAccounts();
    }
  }, [status, user, accountsLoaded, loadAccounts]);

  // Notification badge polling — backend has no push, so we poll
  // /notifications/unread-count every 30s. Stops on sign-out via
  // the cleanup return.
  useEffect(() => {
    if (status !== 'authenticated') return;
    useNotificationsStore.getState().start();
    return () => useNotificationsStore.getState().stop();
  }, [status]);

  // Real-time trade sync — reflect trades placed on the web (or any other
  // device) on the same account here within a tick, across every tab.
  useEffect(() => {
    if (status !== 'authenticated') return;
    const stop = startTradeSync();
    return stop;
  }, [status]);

  // Push notifications — register this device + route taps to the inbox.
  // No-op in Expo Go (no real push token); works in a dev/production build
  // once the backend's /notifications/devices + push-send ship.
  useEffect(() => {
    if (status !== 'authenticated') return;
    void setupPushNotifications();
    return () => teardownPushNotifications();
  }, [status]);

  if (status === 'loading') return null;
  if (status === 'unauthenticated') return <Redirect href="/(auth)/login" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
