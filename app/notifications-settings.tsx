import { useQuery } from "@powersync/react";
import { Stack } from "expo-router";
import React, { useCallback } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PermissionBanner } from "@/components/settings/permission-banner";
import { SettingRow } from "@/components/settings/setting-row";
import { ThresholdPicker } from "@/components/settings/threshold-picker";
import { COLORS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import {
  NOTIFICATION_PREFERENCES_QUERY,
  updateNotificationPreferences,
} from "@/db/queries";
import type { NotificationPreferencesRecord } from "@/db/schema";
import { useNotificationPermissionStatus } from "@/hooks/useNotificationPermissionStatus";
import { openSystemNotificationSettings } from "@/lib/notifications";

export default function NotificationsSettingsScreen(): React.ReactElement {
  const { data: prefsData } = useQuery<NotificationPreferencesRecord>(
    NOTIFICATION_PREFERENCES_QUERY,
  );
  const prefs = prefsData.length > 0 ? prefsData[0] : null;
  const { granted } = useNotificationPermissionStatus();

  const idleEnabled = prefs?.idle_reminder_enabled === 1;
  const longRunningEnabled = prefs?.long_running_enabled === 1;
  const thresholdOverride = prefs?.threshold_override_seconds ?? null;
  const permissionDenied = granted === false;

  const handleToggleIdle = useCallback((value: boolean) => {
    void updateNotificationPreferences({
      idle_reminder_enabled: value ? 1 : 0,
    });
  }, []);

  const handleToggleLongRunning = useCallback((value: boolean) => {
    void updateNotificationPreferences({
      long_running_enabled: value ? 1 : 0,
    });
  }, []);

  const handleThresholdChange = useCallback((next: number | null) => {
    void updateNotificationPreferences({
      threshold_override_seconds: next,
    });
  }, []);

  const handleOpenSettings = useCallback(() => {
    void openSystemNotificationSettings();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Notifications" }} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            Gentle nudges so a forgotten timer or a run-away session can&apos;t
            quietly eat your day.
          </Text>
        </View>

        {permissionDenied ? (
          <View style={styles.bannerWrap}>
            <PermissionBanner onOpenSettings={handleOpenSettings} />
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Reminders</Text>
        <View style={styles.group}>
          <SettingRow
            title="Still there?"
            description="Nudge me 30 minutes after I stop a timer."
            disabled={permissionDenied}
            trailing={
              <Switch
                value={idleEnabled}
                onValueChange={handleToggleIdle}
                disabled={permissionDenied}
                trackColor={{ true: COLORS.primary, false: COLORS.outlineVariant }}
                thumbColor={COLORS.surfaceContainerLowest}
              />
            }
          />
          <SettingRow
            title="Long-running session"
            description="Nudge me when a timer runs longer than expected."
            disabled={permissionDenied}
            trailing={
              <Switch
                value={longRunningEnabled}
                onValueChange={handleToggleLongRunning}
                disabled={permissionDenied}
                trackColor={{ true: COLORS.primary, false: COLORS.outlineVariant }}
                thumbColor={COLORS.surfaceContainerLowest}
              />
            }
          />
        </View>

        <Text style={styles.sectionLabel}>Long-running threshold</Text>
        <View style={styles.thresholdCard}>
          <ThresholdPicker
            value={thresholdOverride}
            onChange={handleThresholdChange}
            disabled={permissionDenied || !longRunningEnabled}
          />
          <Text style={styles.thresholdHelper}>
            {thresholdOverride === null
              ? "Auto uses each activity's typical duration from the last 30 days."
              : "A fixed threshold is applied to every activity."}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING["4xl"],
    gap: SPACING.md,
  },
  header: {
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.md,
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
  bannerWrap: {
    marginTop: SPACING.sm,
  },
  sectionLabel: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  group: {
    gap: SPACING.sm,
  },
  thresholdCard: {
    padding: SPACING.lg,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainerLow,
    gap: SPACING.md,
  },
  thresholdHelper: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
  },
});
