import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/** Stack layout for the authenticated app surface. Bounces to /auth/login
 *  if the user isn't signed in. Bottom-tab nav arrives in Phase 5+ — for
 *  now the only screen is /(app)/index. */
export default function AppLayout() {
  const status = useAuthStore((s) => s.status);
  if (status === 'loading') return null; // splash still up via root layout
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
