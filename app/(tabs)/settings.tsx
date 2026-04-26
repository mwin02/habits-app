import { Feather } from "@expo/vector-icons";
import { useQuery } from "@powersync/react";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SettingRow } from "@/components/settings/setting-row";
import { COLORS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import { NOTIFICATION_PREFERENCES_QUERY } from "@/db/queries";
import type { NotificationPreferencesRecord } from "@/db/schema";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { exportDataAsJson } from "@/lib/export-json";

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
  const [isExportingJson, setIsExportingJson] = useState(false);

  const handleExportJson = useCallback(async () => {
    if (isExportingJson) return;
    setIsExportingJson(true);
    try {
      await exportDataAsJson();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Export failed", message);
    } finally {
      setIsExportingJson(false);
    }
  }, [isExportingJson]);

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
          title="Export data"
          description={
            isExportingJson
              ? "Preparing export…"
              : "Save a JSON snapshot of everything you've tracked"
          }
          onPress={handleExportJson}
          disabled={isExportingJson}
          iconBackground={COLORS.surfaceContainer}
          iconChildren={
            <Feather name="download" size={20} color={COLORS.primary} />
          }
        />
      </ScrollView>
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
});
