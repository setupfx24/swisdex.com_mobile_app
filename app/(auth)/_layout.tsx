import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/** Stack layout for unauthenticated screens. Already-authenticated users
 *  who navigate here (e.g. via a stale deep link) bounce to the app home. */
export default function AuthLayout() {
  const status = useAuthStore((s) => s.status);
  if (status === 'authenticated') return <Redirect href="/(app)" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
