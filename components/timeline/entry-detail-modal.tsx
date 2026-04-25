import { CategoryChip } from "@/components/common/category-chip";
import { TagChip } from "@/components/common/tag-chip";
import { TagPicker } from "@/components/common/tag-picker";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import { deleteEntry, setEntryTags, updateEntryTimes } from "@/db/queries";
import { useEntryTags } from "@/hooks/useEntryTags";
import type { TimelineEntryData } from "@/hooks/useTimelineData";
import { formatDuration, formatTimeInTimezone } from "@/lib/timezone";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface EntryDetailModalProps {
  entry: TimelineEntryData | null;
  onClose: () => void;
}

type ActivePicker = "start" | "end" | null;

export function EntryDetailModal({
  entry,
  onClose,
}: EntryDetailModalProps): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const [editedStart, setEditedStart] = useState<Date>(new Date());
  const [editedEnd, setEditedEnd] = useState<Date | null>(null);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [saving, setSaving] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const { tags: entryTags } = useEntryTags(entry?.id ?? null);

  // Reset state when entry changes
  useEffect(() => {
    if (entry) {
      setEditedStart(entry.startedAt);
      setEditedEnd(entry.endedAt);
      setActivePicker(null);
    }
  }, [entry?.id]);

  const timesDirty =
    entry != null &&
    (editedStart.getTime() !== entry.startedAt.getTime() ||
      (editedEnd != null &&
        entry.endedAt != null &&
        editedEnd.getTime() !== entry.endedAt.getTime()));

  const isValid = editedEnd === null || editedStart < editedEnd;

  const handleStartChange = useCallback(
    (_event: unknown, date?: Date): void => {
      if (date) setEditedStart(date);
    },
    [],
  );

  const handleEndChange = useCallback((_event: unknown, date?: Date): void => {
    if (date) setEditedEnd(date);
  }, []);

  const handleTogglePicker = useCallback((picker: "start" | "end"): void => {
    setActivePicker((prev) => (prev === picker ? null : picker));
  }, []);

  const handleSaveTimes = useCallback(async (): Promise<void> => {
    if (!entry || !timesDirty || !isValid || editedEnd === null) return;
    setSaving(true);
    try {
      await updateEntryTimes(entry.id, editedStart, editedEnd);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [entry, editedStart, editedEnd, timesDirty, isValid, onClose]);

  const handleDelete = useCallback((): void => {
    if (!entry) return;
    Alert.alert(
      "Delete Entry",
      "This entry will be removed from your timeline.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteEntry(entry.id);
            onClose();
          },
        },
      ],
    );
  }, [entry, onClose]);

  if (!entry) return null;

  const tz = entry.timezone;

  // Compute duration from edited times for live feedback
  const durationLabel = (() => {
    if (editedEnd === null) return "Running";
    const seconds = Math.round(
      (editedEnd.getTime() - editedStart.getTime()) / 1000,
    );
    return seconds > 0 ? formatDuration(seconds) : "—";
  })();

  const startTimeLabel = formatTimeInTimezone(editedStart.toISOString(), tz);
  const endTimeLabel = editedEnd
    ? formatTimeInTimezone(editedEnd.toISOString(), tz)
    : "Now";

  const sourceLabel =
    entry.source === "timer"
      ? "Timer"
      : entry.source === "retroactive"
        ? "Retroactive"
        : entry.source === "manual"
          ? "Manual"
          : "Import";

  // Determine picker value and handler based on active picker
  const pickerValue =
    activePicker === "start"
      ? editedStart
      : activePicker === "end" && editedEnd
        ? editedEnd
        : null;
  const pickerOnChange =
    activePicker === "start" ? handleStartChange : handleEndChange;
  const pickerMin = activePicker === "end" ? editedStart : undefined;
  const pickerMax =
    activePicker === "start" ? (editedEnd ?? new Date()) : new Date();

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Entry Details</Text>
            <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={COLORS.onSurfaceVariant} />
            </Pressable>
          </View>

          {/* Activity info */}
          <View style={styles.infoCard}>
            <Text style={styles.activityName}>{entry.activityName}</Text>
            <View style={styles.chipRow}>
              <CategoryChip
                name={entry.categoryName}
                color={entry.categoryColor}
              />
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceText}>{sourceLabel}</Text>
              </View>
            </View>

            <View style={styles.durationRow}>
              <Feather name="clock" size={14} color={COLORS.onSurfaceVariant} />
              <Text style={styles.durationText}>{durationLabel}</Text>
            </View>
          </View>

          {/* Tags row */}
          <Pressable
            style={styles.tagsRow}
            onPress={() => setTagPickerOpen(true)}
          >
            <Feather name="tag" size={14} color={COLORS.onSurfaceVariant} />
            {entryTags.length === 0 ? (
              <Text style={styles.tagsPlaceholder}>Add tags</Text>
            ) : (
              <View style={styles.tagsList}>
                {entryTags.map((t) => (
                  <TagChip key={t.id} name={t.name} color={t.color} />
                ))}
              </View>
            )}
            <Feather
              name="chevron-right"
              size={16}
              color={COLORS.onSurfaceVariant}
            />
          </Pressable>

          {/* Time rows */}
          <View style={styles.timeSection}>
            {/* Start time row */}
            <Pressable
              style={[
                styles.timeRow,
                activePicker === "start" && styles.timeRowActive,
              ]}
              onPress={() => handleTogglePicker("start")}
              disabled={entry.endedAt === null} // Disable if entry is running since start time to not allow editing of active entry
            >
              <Text style={styles.timeLabel}>Start</Text>
              <Text
                style={[
                  styles.timeValue,
                  activePicker === "start" && styles.timeValueActive,
                ]}
              >
                {startTimeLabel}
              </Text>
              {entry.endedAt !== null && (
                <Feather
                  name={
                    activePicker === "start" ? "chevron-up" : "chevron-down"
                  }
                  size={16}
                  color={
                    activePicker === "start"
                      ? COLORS.primary
                      : COLORS.onSurfaceVariant
                  }
                />
              )}
            </Pressable>

            {/* End time row */}
            {editedEnd !== null && (
              <Pressable
                style={[
                  styles.timeRow,
                  activePicker === "end" && styles.timeRowActive,
                ]}
                onPress={() => handleTogglePicker("end")}
              >
                <Text style={styles.timeLabel}>End</Text>
                <Text
                  style={[
                    styles.timeValue,
                    activePicker === "end" && styles.timeValueActive,
                  ]}
                >
                  {endTimeLabel}
                </Text>
                <Feather
                  name={activePicker === "end" ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={
                    activePicker === "end"
                      ? COLORS.primary
                      : COLORS.onSurfaceVariant
                  }
                />
              </Pressable>
            )}
          </View>

          {/* Inline picker — shown only when a time row is tapped */}
          {activePicker !== null && pickerValue !== null && (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={pickerValue}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={pickerOnChange}
                minimumDate={pickerMin}
                maximumDate={pickerMax}
                themeVariant="light"
              />
            </View>
          )}

          {/* Actions — fixed-height row to avoid modal resize */}
          <View style={styles.actions}>
            {timesDirty && isValid && editedEnd !== null ? (
              <>
                <Pressable
                  onPress={handleSaveTimes}
                  style={({ pressed }) => [
                    styles.saveButtonWrapper,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.saveButton}
                  >
                    <Feather name="check" size={16} color={COLORS.onPrimary} />
                    <Text style={styles.saveButtonText}>
                      {saving ? "Saving..." : "Save Changes"}
                    </Text>
                  </LinearGradient>
                </Pressable>
                <Pressable
                  style={styles.deleteIconButton}
                  onPress={handleDelete}
                  hitSlop={8}
                >
                  <Feather name="trash-2" size={18} color={COLORS.error} />
                </Pressable>
              </>
            ) : timesDirty && !isValid ? (
              <>
                <Text style={styles.validationError}>
                  Start must be before end
                </Text>
                <Pressable
                  style={styles.deleteIconButton}
                  onPress={handleDelete}
                  hitSlop={8}
                >
                  <Feather name="trash-2" size={18} color={COLORS.error} />
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <Feather name="trash-2" size={16} color={COLORS.error} />
                <Text style={styles.deleteButtonText}>Delete entry</Text>
              </Pressable>
            )}
          </View>
        </View>

        {entry && (
          <TagPicker
            visible={tagPickerOpen}
            initialSelectedIds={entryTags.map((t) => t.id)}
            onClose={() => setTagPickerOpen(false)}
            onConfirm={(ids) => {
              void setEntryTags(entry.id, ids);
            }}
          />
        )}
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
    alignItems: "center",
    marginBottom: SPACING["2xl"],
  },
  headerTitle: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
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
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  activityName: {
    ...TYPOGRAPHY.heading,
    color: COLORS.onSurface,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  sourceBadge: {
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  sourceText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  durationText: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
  },
  timeSection: {
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  timeRowActive: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  timeLabel: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    flex: 1,
  },
  timeValue: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
    marginRight: SPACING.sm,
  },
  timeValueActive: {
    color: COLORS.primary,
  },
  pickerContainer: {
    marginBottom: SPACING.lg,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    gap: SPACING.md,
  },
  saveButtonWrapper: {
    flex: 1,
    height: 48,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: RADIUS.full,
    gap: SPACING.sm,
  },
  saveButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.onPrimary,
  },
  validationError: {
    ...TYPOGRAPHY.body,
    color: COLORS.error,
    flex: 1,
  },
  deleteIconButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  deleteButtonText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.error,
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  tagsPlaceholder: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
  },
  tagsList: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
});
