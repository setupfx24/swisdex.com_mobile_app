import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import { useTheme } from '@/theme';

// Keep the splash on-screen until we explicitly hide it from the root
// component — once we have the API client + auth bootstrap (Phase 3), this
// will await the auth restoration before hiding. For now we hide on first
// render so the placeholder screen is visible.
SplashScreen.preventAutoHideAsync().catch(() => {
  // preventAutoHideAsync can reject if the splash is already hidden — safe
  // to swallow, the next call will succeed.
});

export default function RootLayout() {
  const theme = useTheme();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

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
