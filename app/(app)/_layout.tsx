import { useEffect } from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useAccountsStore } from '@/stores/accountsStore';
import { useNotificationsStore } from '@/stores/notificationsStore';

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
