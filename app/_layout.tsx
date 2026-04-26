import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { PowerSyncContext } from "@powersync/react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import {
  seedNotificationPreferencesIfNeeded,
  seedPresetsIfNeeded,
  seedUserPreferencesIfNeeded,
} from "@/db/seed";
import { useNotificationScheduler } from "@/hooks/useNotificationScheduler";
import { db } from "@/lib/powersync";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
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
        console.log("[Habits] Starting DB init...");
        await db.init();
        console.log("[Habits] DB init complete, seeding...");
        await seedPresetsIfNeeded();
        await seedNotificationPreferencesIfNeeded();
        await seedUserPreferencesIfNeeded();
        console.log("[Habits] Seed complete");
      } catch (e) {
        console.error("[Habits] DB init failed:", e);
      } finally {
        setDbReady(true);
      }
    }
    console.log("[Habits] useEffect fired");
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
    <GestureHandlerRootView style={{ flex: 1 }}>
    <PowerSyncContext.Provider value={db}>
      <NotificationSchedulerMount />
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          <Stack.Screen
            name="manage-activities"
            options={{
              title: "Manage Activities",
              headerBackTitle: "Back",
              headerTitle: "",
            }}
          />
          <Stack.Screen
            name="manage-categories"
            options={{
              title: "Manage Categories",
              headerBackTitle: "Back",
              headerTitle: "",
            }}
          />
          <Stack.Screen
            name="manage-tags"
            options={{
              title: "Manage Tags",
              headerBackTitle: "Back",
              headerTitle: "",
            }}
          />
          <Stack.Screen
            name="ideal-allocations"
            options={{
              title: "Ideal Allocations",
              headerBackTitle: "Back",
              headerTitle: "",
            }}
          />
          <Stack.Screen
            name="notifications-settings"
            options={{
              title: "Notifications",
              headerBackTitle: "Back",
              headerTitle: "",
            }}
          />
          <Stack.Screen
            name="general-preferences"
            options={{
              title: "General",
              headerBackTitle: "Back",
              headerTitle: "",
            }}
          />
          <Stack.Screen
            name="manage-data"
            options={{
              title: "Manage data",
              headerBackTitle: "Back",
              headerTitle: "",
            }}
          />
        </Stack>
      </ThemeProvider>
    </PowerSyncContext.Provider>
    </GestureHandlerRootView>
  );
}

function NotificationSchedulerMount(): null {
  useNotificationScheduler();
  return null;
}
