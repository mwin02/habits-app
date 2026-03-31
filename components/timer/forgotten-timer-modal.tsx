import { GradientButton } from "@/components/common/gradient-button";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import type { RunningTimer } from "@/db/models";
import {
  formatDateInTimezone,
  formatDuration,
  formatTimeInTimezone,
  isToday,
} from "@/lib/timezone";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useCallback, useEffect, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ForgottenTimerModalProps {
  entry: RunningTimer | null;
  onConfirmStop: (endedAt: Date) => void;
  onDismiss: () => void;
  onDiscard: () => void;
}

function getDefaultEndTime(startedAt: Date): Date {
  const oneHourAfter = new Date(startedAt.getTime() + 3600_000);
  const now = new Date();
  return oneHourAfter > now ? now : oneHourAfter;
}

export function ForgottenTimerModal({
  entry,
  onConfirmStop,
  onDismiss,
  onDiscard,
}: ForgottenTimerModalProps): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const [selectedTime, setSelectedTime] = useState<Date>(() =>
    entry ? getDefaultEndTime(entry.startedAt) : new Date(),
  );

  // Reset selected time when a new forgotten entry appears
  useEffect(() => {
    if (entry) {
      setSelectedTime(getDefaultEndTime(entry.startedAt));
    }
  }, [entry?.entryId]);

  const handleTimeChange = useCallback(
    (_event: unknown, date?: Date): void => {
      if (date) {
        setSelectedTime(date);
      }
    },
    [],
  );

  const handleConfirm = useCallback((): void => {
    onConfirmStop(selectedTime);
  }, [onConfirmStop, selectedTime]);

  if (!entry) return null;

  const timezone = entry.timezone;
  const startedOnDifferentDay = !isToday(entry.startedAt.toISOString(), timezone);
  const pickerMode = startedOnDifferentDay ? "datetime" : "time";

  const startTimeLabel = formatTimeInTimezone(
    entry.startedAt.toISOString(),
    timezone,
  );
  const startDateLabel = startedOnDifferentDay
    ? formatDateInTimezone(entry.startedAt.toISOString(), timezone)
    : null;
  const durationLabel = formatDuration(entry.elapsedSeconds);
  const stopTimeLabel = formatTimeInTimezone(
    selectedTime.toISOString(),
    timezone,
  );

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onDismiss} />

        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Forgotten Timer</Text>
              <Text style={styles.headerSubtitle}>
                When did you stop?
              </Text>
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={onDismiss}
              hitSlop={8}
            >
              <Feather name="x" size={20} color={COLORS.onSurfaceVariant} />
            </Pressable>
          </View>

          {/* Activity info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View
                style={[
                  styles.categoryDot,
                  { backgroundColor: entry.categoryColor },
                ]}
              />
              <Text style={styles.categoryLabel}>{entry.categoryName}</Text>
            </View>
            <Text style={styles.activityName}>{entry.activityName}</Text>
            <View style={styles.infoDetails}>
              <Feather
                name="clock"
                size={14}
                color={COLORS.onSurfaceVariant}
              />
              <Text style={styles.infoDetailText}>
                Started at {startTimeLabel}
                {startDateLabel ? ` on ${startDateLabel}` : ""}
              </Text>
            </View>
            <View style={styles.infoDetails}>
              <Feather
                name="activity"
                size={14}
                color={COLORS.onSurfaceVariant}
              />
              <Text style={styles.infoDetailText}>
                Running for {durationLabel}
              </Text>
            </View>
          </View>

          {/* Time picker */}
          <View style={styles.pickerSection}>
            <Text style={styles.pickerLabel}>Stopped at</Text>
            <DateTimePicker
              value={selectedTime}
              mode={pickerMode}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleTimeChange}
              minimumDate={entry.startedAt}
              maximumDate={new Date()}
              themeVariant="light"
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <GradientButton
              shape="pill"
              label={`Stopped at ${stopTimeLabel}`}
              onPress={handleConfirm}
            >
              <Feather name="check" size={18} color={COLORS.onPrimary} />
            </GradientButton>

            <Pressable style={styles.secondaryButton} onPress={onDismiss}>
              <Text style={styles.secondaryButtonText}>Still going</Text>
            </Pressable>

            <Pressable style={styles.discardButton} onPress={onDiscard}>
              <Feather name="trash-2" size={16} color={COLORS.error} />
              <Text style={styles.discardButtonText}>Discard entry</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING["2xl"],
    paddingTop: SPACING.md,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.outlineVariant,
    alignSelf: "center",
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING["2xl"],
  },
  headerTitle: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },
  closeButton: {
    padding: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  infoCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING["2xl"],
    gap: SPACING.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryLabel: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
  },
  activityName: {
    ...TYPOGRAPHY.heading,
    color: COLORS.onSurface,
  },
  infoDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  infoDetailText: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
  },
  pickerSection: {
    marginBottom: SPACING["2xl"],
  },
  pickerLabel: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.sm,
  },
  actions: {
    gap: SPACING.md,
    alignItems: "center",
  },
  secondaryButton: {
    paddingVertical: SPACING.md,
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.primary,
  },
  discardButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  discardButtonText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.error,
  },
});
