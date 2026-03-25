import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { PowerSyncContext } from '@powersync/react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { db } from '@/lib/powersync';
import { seedPresetsIfNeeded } from '@/db/seed';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [dbReady, setDbReady] = useState(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Initialize PowerSync database and seed presets
  useEffect(() => {
    async function initDB() {
      try {
        console.log('[Habits] Starting DB init...');
        await db.init();
        console.log('[Habits] DB init complete, seeding...');
        await seedPresetsIfNeeded();
        console.log('[Habits] Seed complete');
      } catch (e) {
        console.error('[Habits] DB init failed:', e);
      } finally {
        setDbReady(true);
      }
    }
    console.log('[Habits] useEffect fired');
    initDB();
  }, []);

  useEffect(() => {
    if (loaded && dbReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, dbReady]);

  if (!loaded || !dbReady) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <PowerSyncContext.Provider value={db}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </PowerSyncContext.Provider>
  );
}
