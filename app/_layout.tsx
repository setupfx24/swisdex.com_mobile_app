import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { View, LogBox } from 'react-native';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';

// Hold the splash screen until bootstrap completes — the user must not see
// the unauthenticated UI flicker before SecureStore has resolved.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Race condition with hot reload — safe to swallow.
});

// Expo Go (DEV only): the dev runtime tries to keep the screen awake while
// connected to Metro. Some Android devices reject the native call, producing a
// benign "Unable to activate keep awake" unhandled promise rejection that
// red-boxes. It never happens in a production/standalone build. Swallow it here
// (other rejections still surface as console warnings) so dev isn't interrupted.
if (__DEV__) {
  LogBox.ignoreLogs(['Unable to activate keep awake']);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tracking = require('promise/setimmediate/rejection-tracking');
    tracking.enable({
      allRejections: true,
      onUnhandled: (id: number, error: unknown) => {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('keep awake')) return; // benign Expo dev rejection
        console.warn(`Unhandled promise rejection (${id}):`, error);
      },
      onHandled: () => {},
    });
  } catch {
    // rejection-tracking module not resolvable — nothing to do.
  }
}

export default function RootLayout() {
  const theme = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    useAuthStore
      .getState()
      .bootstrap()
      .finally(() => {
        if (cancelled) return;
        setReady(true);
        SplashScreen.hideAsync().catch(() => {});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Render nothing until bootstrap resolves so the splash stays visible —
  // expo-router's Stack mounts the first route as soon as the tree exists,
  // which would race the splash hide and show a blank frame.
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.bg.base }}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: theme.colors.bg.base }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.bg.base },
              animation: 'slide_from_right',
            }}
          />
          <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
