import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';

// Hold the splash screen until bootstrap completes — the user must not see
// the unauthenticated UI flicker before SecureStore has resolved.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Race condition with hot reload — safe to swallow.
});

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
