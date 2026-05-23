import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/** Root redirector. The bootstrap (see app/_layout.tsx) has already resolved
 *  before this component mounts — we just funnel into the right group. */
export default function RootIndex() {
  const status = useAuthStore((s) => s.status);
  if (status === 'authenticated') return <Redirect href="/markets" />;
  return <Redirect href="/(auth)/login" />;
}
