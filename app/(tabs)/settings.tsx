import { Feather } from "@expo/vector-icons";
import { useQuery } from "@powersync/react";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SignOutPromptModal } from "@/components/common/sign-out-prompt-modal";
import { SettingRow } from "@/components/settings/setting-row";
import { COLORS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import { NOTIFICATION_PREFERENCES_QUERY } from "@/db/queries";
import type { NotificationPreferencesRecord } from "@/db/schema";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";

const WEEK_START_LABELS: Record<number, string> = {
  0: "Mon",
  1: "Tue",
  2: "Wed",
  3: "Thu",
  4: "Fri",
  5: "Sat",
  6: "Sun",
};

const PERIOD_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

function formatThresholdSummary(seconds: number | null): string {
  if (seconds === null) return "Auto";
  const minutes = Math.round(seconds / 60);
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}

function buildNotificationSummary(
  prefs: NotificationPreferencesRecord | null,
): string {
  if (!prefs) return "Loading…";
  const idle = prefs.idle_reminder_enabled === 1;
  const longRunning = prefs.long_running_enabled === 1;
  if (!idle && !longRunning) return "All reminders off";
  const parts: string[] = [];
  if (idle) parts.push("Idle");
  if (longRunning) {
    const threshold = formatThresholdSummary(
      prefs.threshold_override_seconds ?? null,
    );
    parts.push(`Long-running · ${threshold}`);
  }
  return parts.join(" · ");
}

export default function SettingsScreen(): React.ReactElement {
  const router = useRouter();
  const { data: prefsData } = useQuery<NotificationPreferencesRecord>(
    NOTIFICATION_PREFERENCES_QUERY,
  );
  const prefs = prefsData.length > 0 ? prefsData[0] : null;
  const { preferences } = useUserPreferences();
  const { user, signOut } = useAuth();
  const [signOutPromptVisible, setSignOutPromptVisible] = useState(false);

  const handleSignIn = useCallback(() => {
    router.push("/(auth)/sign-in");
  }, [router]);

  const openSignOutPrompt = useCallback(() => {
    setSignOutPromptVisible(true);
  }, []);

  const closeSignOutPrompt = useCallback(() => {
    setSignOutPromptVisible(false);
  }, []);

  const handleSignOut = useCallback(
    async (_wipeLocal: boolean) => {
      // Block 6 wires the wipeLocal path; for now both options just sign out.
      await signOut();
      setSignOutPromptVisible(false);
    },
    [signOut],
  );

  const goToGeneralPreferences = useCallback(() => {
    router.push("/general-preferences");
  }, [router]);

  const goToIdealAllocations = useCallback(() => {
    router.push("/ideal-allocations");
  }, [router]);

  const goToNotifications = useCallback(() => {
    router.push("/notifications-settings");
  }, [router]);

  const goToManageCategories = useCallback(() => {
    router.push("/manage-categories");
  }, [router]);

  const goToManageActivities = useCallback(() => {
    router.push("/manage-activities");
  }, [router]);

  const goToManageTags = useCallback(() => {
    router.push("/manage-tags");
  }, [router]);

  const goToManageData = useCallback(() => {
    router.push("/manage-data");
  }, [router]);

  const notificationSummary = useMemo(
    () => buildNotificationSummary(prefs),
    [prefs],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          Shape how the app nudges you and what you&apos;re aiming for.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Account</Text>
        {user ? (
          <SettingRow
            title={user.email ?? "Signed in"}
            description="Tap to sign out"
            onPress={openSignOutPrompt}
            iconBackground={COLORS.surfaceContainer}
            iconChildren={
              <Feather name="user" size={20} color={COLORS.primary} />
            }
          />
        ) : (
          <SettingRow
            title="Sign in"
            description="Back up and sync across devices"
            onPress={handleSignIn}
            iconBackground={COLORS.surfaceContainer}
            iconChildren={
              <Feather name="log-in" size={20} color={COLORS.primary} />
            }
          />
        )}

        <Text style={styles.sectionLabel}>Preferences</Text>
        <SettingRow
          title="General"
          description={`Week starts ${WEEK_START_LABELS[preferences.weekStartDay]} · Insights ${PERIOD_LABELS[preferences.defaultInsightsPeriod]}`}
          onPress={goToGeneralPreferences}
          iconBackground={COLORS.surfaceContainer}
          iconChildren={
            <Feather name="sliders" size={20} color={COLORS.primary} />
          }
        />
        <SettingRow
          title="Notifications"
          description={notificationSummary}
          onPress={goToNotifications}
          iconBackground={COLORS.surfaceContainer}
          iconChildren={
            <Feather name="bell" size={20} color={COLORS.primary} />
          }
        />
        <SettingRow
          title="Goals"
          description="Ideal hours per day for each category"
          onPress={goToIdealAllocations}
          iconBackground={COLORS.surfaceContainer}
          iconChildren={
            <Feather name="target" size={20} color={COLORS.primary} />
          }
        />
        <SettingRow
          title="Manage categories"
          description="Recolor or change category icons"
          onPress={goToManageCategories}
          iconBackground={COLORS.surfaceContainer}
          iconChildren={
            <Feather name="grid" size={20} color={COLORS.primary} />
          }
        />
        <SettingRow
          title="Manage activities"
          description="Add, rename, or archive activities"
          onPress={goToManageActivities}
          iconBackground={COLORS.surfaceContainer}
          iconChildren={
            <Feather name="list" size={20} color={COLORS.primary} />
          }
        />
        <SettingRow
          title="Manage tags"
          description="Add, rename, recolor, or archive tags"
          onPress={goToManageTags}
          iconBackground={COLORS.surfaceContainer}
          iconChildren={
            <Feather name="tag" size={20} color={COLORS.primary} />
          }
        />
        <SettingRow
          title="Manage data"
          description="Export or wipe what you've tracked"
          onPress={goToManageData}
          iconBackground={COLORS.surfaceContainer}
          iconChildren={
            <Feather name="database" size={20} color={COLORS.primary} />
          }
        />
      </ScrollView>

      <SignOutPromptModal
        visible={signOutPromptVisible}
        onDismiss={closeSignOutPrompt}
        onSignOut={handleSignOut}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING["4xl"],
    gap: SPACING.sm,
  },
  sectionLabel: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
  },
});
