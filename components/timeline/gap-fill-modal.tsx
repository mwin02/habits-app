import { CategoryChip } from "@/components/common/category-chip";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import { createRetroactiveEntry } from "@/db/queries";
import {
  useCategoriesWithActivities,
} from "@/hooks/useCategoriesWithActivities";
import {
  formatDuration,
  formatTimeInTimezone,
  getCurrentTimezone,
} from "@/lib/timezone";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface GapFillModalProps {
  gap: { startedAt: Date; endedAt: Date } | null;
  onClose: () => void;
}

type ActivePicker = "start" | "end" | null;

export function GapFillModal({
  gap,
  onClose,
}: GapFillModalProps): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const { categories } = useCategoriesWithActivities();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editedStart, setEditedStart] = useState<Date>(new Date());
  const [editedEnd, setEditedEnd] = useState<Date>(new Date());
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  const timezone = getCurrentTimezone();

  // Reset times when gap changes
  useEffect(() => {
    if (gap) {
      setEditedStart(gap.startedAt);
      setEditedEnd(gap.endedAt);
      setActivePicker(null);
      setSelectedCategoryId(null);
    }
  }, [gap?.startedAt.getTime(), gap?.endedAt.getTime()]);

  const filteredActivities = useMemo(() => {
    if (!selectedCategoryId) {
      return categories.flatMap((c) => c.activities);
    }
    const category = categories.find((c) => c.id === selectedCategoryId);
    return category?.activities ?? [];
  }, [categories, selectedCategoryId]);

  const handleStartChange = useCallback(
    (_event: unknown, date?: Date): void => {
      if (date) setEditedStart(date);
    },
    [],
  );

  const handleEndChange = useCallback(
    (_event: unknown, date?: Date): void => {
      if (date) setEditedEnd(date);
    },
    [],
  );

  const handleTogglePicker = useCallback(
    (picker: "start" | "end"): void => {
      setActivePicker((prev) => (prev === picker ? null : picker));
    },
    [],
  );

  const handleSelectActivity = useCallback(
    async (activityId: string): Promise<void> => {
      if (!gap || saving) return;
      setSaving(true);
      try {
        await createRetroactiveEntry({
          activityId,
          startedAt: editedStart,
          endedAt: editedEnd,
          timezone,
        });
        onClose();
      } finally {
        setSaving(false);
      }
    },
    [gap, editedStart, editedEnd, timezone, onClose, saving],
  );

  if (!gap) return null;

  const durationSeconds = Math.round(
    (editedEnd.getTime() - editedStart.getTime()) / 1000,
  );
  const startLabel = formatTimeInTimezone(editedStart.toISOString(), timezone);
  const endLabel = formatTimeInTimezone(editedEnd.toISOString(), timezone);
  const isValid = editedStart < editedEnd;

  // Picker config based on active picker
  const pickerValue = activePicker === "start" ? editedStart : editedEnd;
  const pickerOnChange =
    activePicker === "start" ? handleStartChange : handleEndChange;
  // Constrain pickers within the original gap bounds and each other
  const pickerMin =
    activePicker === "start" ? gap.startedAt : editedStart;
  const pickerMax =
    activePicker === "start" ? editedEnd : gap.endedAt;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Fill Gap</Text>
              <Text style={styles.headerSubtitle}>
                What were you doing?
              </Text>
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={8}
            >
              <Feather name="x" size={20} color={COLORS.onSurfaceVariant} />
            </Pressable>
          </View>

          {/* Time rows */}
          <View style={styles.timeSection}>
            {/* Start time row */}
            <Pressable
              style={[
                styles.timePickerRow,
                activePicker === "start" && styles.timePickerRowActive,
              ]}
              onPress={() => handleTogglePicker("start")}
            >
              <Text style={styles.timeLabel}>Start</Text>
              <Text
                style={[
                  styles.timeValue,
                  activePicker === "start" && styles.timeValueActive,
                ]}
              >
                {startLabel}
              </Text>
              <Feather
                name={activePicker === "start" ? "chevron-up" : "chevron-down"}
                size={16}
                color={
                  activePicker === "start"
                    ? COLORS.primary
                    : COLORS.onSurfaceVariant
                }
              />
            </Pressable>

            {/* End time row */}
            <Pressable
              style={[
                styles.timePickerRow,
                activePicker === "end" && styles.timePickerRowActive,
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
                {endLabel}
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

            {/* Duration */}
            <View style={styles.durationRow}>
              <Feather name="clock" size={14} color={COLORS.onSurfaceVariant} />
              <Text style={styles.durationText}>
                {isValid ? formatDuration(durationSeconds) : "—"}
              </Text>
            </View>
          </View>

          {/* Inline picker */}
          {activePicker !== null && (
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

          {/* Validation error */}
          {!isValid && (
            <Text style={styles.validationError}>
              Start time must be before end time
            </Text>
          )}

          {/* Category filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            <Pressable
              style={[
                styles.filterChip,
                !selectedCategoryId && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategoryId(null)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  !selectedCategoryId && styles.filterChipTextActive,
                ]}
              >
                All
              </Text>
            </Pressable>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() =>
                  setSelectedCategoryId(
                    cat.id === selectedCategoryId ? null : cat.id,
                  )
                }
                style={
                  cat.id === selectedCategoryId
                    ? styles.selectedChipWrapper
                    : undefined
                }
              >
                <CategoryChip name={cat.name} color={cat.color} />
              </Pressable>
            ))}
          </ScrollView>

          {/* Activity list */}
          <FlatList
            data={filteredActivities}
            keyExtractor={(item) => item.id}
            style={styles.activityList}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.activityRow,
                  pressed && styles.activityRowPressed,
                ]}
                onPress={() => handleSelectActivity(item.id)}
                disabled={saving || !isValid}
              >
                <View
                  style={[
                    styles.activityDot,
                    { backgroundColor: item.categoryColor },
                  ]}
                />
                <View style={styles.activityInfo}>
                  <Text style={styles.activityName}>{item.name}</Text>
                  <Text style={styles.activityCategory}>
                    {item.categoryName}
                  </Text>
                </View>
                <Feather
                  name="plus"
                  size={18}
                  color={COLORS.onSurfaceVariant}
                />
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No activities found</Text>
            }
          />
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
    maxHeight: "85%",
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
  timeSection: {
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  timePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  timePickerRowActive: {
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
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  durationText: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
  },
  pickerContainer: {
    marginBottom: SPACING.lg,
  },
  validationError: {
    ...TYPOGRAPHY.body,
    color: COLORS.error,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  categoryRow: {
    gap: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    ...TYPOGRAPHY.labelSm,
    color: COLORS.onSurfaceVariant,
  },
  filterChipTextActive: {
    color: COLORS.onPrimary,
  },
  selectedChipWrapper: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  activityList: {
    maxHeight: 300,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  activityRowPressed: {
    backgroundColor: COLORS.surfaceContainerLow,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
  },
  activityCategory: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.outlineVariant,
    textAlign: "center",
    paddingVertical: SPACING["3xl"],
  },
});
