import React, { useCallback } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { SettingRow } from "@/components/settings/setting-row";
import { TimePickerRow } from "@/components/settings/time-picker-row";
import { COLORS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import { updateNotificationPreferences } from "@/db/queries";
import type { NotificationPreferencesRecord } from "@/db/schema";

const DEFAULT_START = "22:00";
const DEFAULT_END = "07:00";

export interface QuietHoursSectionProps {
  prefs: NotificationPreferencesRecord | null;
  permissionDenied: boolean;
}

function parseMinutes(value: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function describeWindow(start: string, end: string): string {
  const startMin = parseMinutes(start);
  const endMin = parseMinutes(end);
  if (startMin === null || endMin === null) {
    return "Mute reminders during this daily window.";
  }
  const wraps = endMin <= startMin;
  return wraps
    ? "Wraps past midnight. Anything that would fire inside the window is deferred to the end."
    : "Same-day window. Anything that would fire inside it is deferred to the end.";
}

export function QuietHoursSection({
  prefs,
  permissionDenied,
}: QuietHoursSectionProps): React.ReactElement {
  const enabled = prefs?.quiet_hours_enabled === 1;
  const start = prefs?.quiet_hours_start ?? DEFAULT_START;
  const end = prefs?.quiet_hours_end ?? DEFAULT_END;

  const handleToggle = useCallback(
    (next: boolean) => {
      void updateNotificationPreferences({
        quiet_hours_enabled: next ? 1 : 0,
        // Backfill defaults the first time the user enables the feature on a
        // pre-v3 row that hasn't been seeded with values yet.
        quiet_hours_start: prefs?.quiet_hours_start ?? DEFAULT_START,
        quiet_hours_end: prefs?.quiet_hours_end ?? DEFAULT_END,
      });
    },
    [prefs],
  );

  const handleStartChange = useCallback((next: string) => {
    void updateNotificationPreferences({ quiet_hours_start: next });
  }, []);

  const handleEndChange = useCallback((next: string) => {
    void updateNotificationPreferences({ quiet_hours_end: next });
  }, []);

  const rowsDisabled = permissionDenied;

  return (
    <View style={styles.group}>
      <SettingRow
        title="Quiet hours"
        description="Mute reminders during a daily window."
        disabled={rowsDisabled}
        trailing={
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            disabled={rowsDisabled}
            trackColor={{ true: COLORS.primary, false: COLORS.outlineVariant }}
            thumbColor={COLORS.surfaceContainerLowest}
          />
        }
      />
      <TimePickerRow
        label="Start"
        value={start}
        onChange={handleStartChange}
        disabled={rowsDisabled || !enabled}
      />
      <TimePickerRow
        label="End"
        value={end}
        onChange={handleEndChange}
        disabled={rowsDisabled || !enabled}
      />
      <Text style={styles.helper}>{describeWindow(start, end)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: SPACING.sm,
  },
  helper: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
    paddingHorizontal: SPACING.xs,
  },
});
