import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryIcon } from "@/components/common/category-icon";
import { GradientButton } from "@/components/common/gradient-button";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import type { CategoryWithActivities, GoalDirection } from "@/db/models";
import {
  clearAllIdealAllocationsForCategory,
  setIdealAllocation,
} from "@/db/queries";
import { useIdealAllocationsForCategory } from "@/hooks/useIdealAllocationsForCategory";

type Mode = "uniform" | "perDay";

const DIRECTION_OPTIONS: {
  value: GoalDirection;
  label: string;
  helper: string;
}[] = [
  { value: "at_least", label: "At least", helper: "Floor — more is fine." },
  { value: "around", label: "Around", helper: "Hit the target either way." },
  { value: "at_most", label: "At most", helper: "Cap — less is fine." },
];

interface GoalEditorModalProps {
  visible: boolean;
  category: CategoryWithActivities | null;
  onClose: () => void;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function GoalEditorModal({
  visible,
  category,
  onClose,
}: GoalEditorModalProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const {
    defaultMinutes,
    perDayMinutes,
    goalDirection: savedDirection,
    isLoading,
  } = useIdealAllocationsForCategory(category?.id ?? null);

  const [mode, setMode] = useState<Mode>("uniform");
  const [direction, setDirection] = useState<GoalDirection>("around");
  const [uniform, setUniform] = useState<HM>({ h: "0", m: "0" });
  const [perDay, setPerDay] = useState<HM[]>(() => emptyPerDay());
  const [submitting, setSubmitting] = useState(false);

  // Seed state each time the modal (re-)opens for a category.
  useEffect(() => {
    if (!visible || !category) return;

    const hasOverrides = perDayMinutes.some((v) => v != null);
    const nextMode: Mode = hasOverrides ? "perDay" : "uniform";
    setMode(nextMode);
    setDirection(savedDirection ?? "around");
    setUniform(minutesToHM(defaultMinutes ?? 0));
    setPerDay(
      perDayMinutes.map((v) =>
        minutesToHM(v != null ? v : defaultMinutes ?? 0),
      ),
    );
    setSubmitting(false);
  }, [visible, category, defaultMinutes, perDayMinutes, savedDirection]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    onClose();
  }, [onClose, submitting]);

  const handleClear = useCallback(() => {
    if (!category) return;
    Alert.alert(
      `Clear goal for ${category.name}?`,
      "This removes every day's target for this category.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            setSubmitting(true);
            try {
              await clearAllIdealAllocationsForCategory(category.id);
              onClose();
            } catch (err) {
              console.error("Failed to clear goal", err);
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }, [category, onClose]);

  const handleSave = useCallback(async () => {
    if (!category) return;
    setSubmitting(true);
    try {
      // Always start from a clean slate so mode switches don't leave stale
      // rows behind (e.g. switching from per-day back to uniform).
      await clearAllIdealAllocationsForCategory(category.id);

      if (mode === "uniform") {
        await setIdealAllocation({
          categoryId: category.id,
          dayOfWeek: null,
          targetMinutesPerDay: hmToMinutes(uniform),
          goalDirection: direction,
        });
      } else {
        // Write 7 rows, one per weekday. Absent/0 days still get a row so
        // the goal is explicit and survives the resolution rule.
        for (let wd = 0; wd < 7; wd++) {
          await setIdealAllocation({
            categoryId: category.id,
            dayOfWeek: wd,
            targetMinutesPerDay: hmToMinutes(perDay[wd]),
            goalDirection: direction,
          });
        }
      }
      onClose();
    } catch (err) {
      console.error("Failed to save goal", err);
      setSubmitting(false);
    }
  }, [category, mode, direction, uniform, perDay, onClose]);

  const totalWeekMinutes = useMemo(() => {
    if (mode === "uniform") return hmToMinutes(uniform) * 7;
    return perDay.reduce((sum, v) => sum + hmToMinutes(v), 0);
  }, [mode, uniform, perDay]);

  const hasExistingGoal =
    defaultMinutes != null || perDayMinutes.some((v) => v != null);

  if (!category) {
    return <Modal visible={false} transparent />;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}
        >
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconBubble,
                  { backgroundColor: category.color + "1F" },
                ]}
              >
                <CategoryIcon
                  icon={category.icon ?? "circle"}
                  size={20}
                  color={category.color}
                />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {category.name}
                </Text>
                <Text style={styles.headerSubtitle}>Daily goal</Text>
              </View>
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Feather name="x" size={22} color={COLORS.onSurface} />
            </Pressable>
          </View>

          {/* Mode toggle */}
          <View style={styles.modeRow}>
            <ModeButton
              label="Same every day"
              active={mode === "uniform"}
              onPress={() => setMode("uniform")}
            />
            <ModeButton
              label="Per day of week"
              active={mode === "perDay"}
              onPress={() => setMode("perDay")}
            />
          </View>

          {/* Direction selector */}
          <Text style={styles.sectionLabel}>GOAL TYPE</Text>
          <View style={styles.directionRow}>
            {DIRECTION_OPTIONS.map((opt) => (
              <DirectionButton
                key={opt.value}
                label={opt.label}
                active={direction === opt.value}
                onPress={() => setDirection(opt.value)}
              />
            ))}
          </View>
          <Text style={styles.directionHelper}>
            {DIRECTION_OPTIONS.find((o) => o.value === direction)?.helper}
          </Text>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            {mode === "uniform" ? (
              <HMInputRow
                label="Every day"
                value={uniform}
                onChange={setUniform}
              />
            ) : (
              perDay.map((value, idx) => (
                <HMInputRow
                  key={DAY_LABELS[idx]}
                  label={DAY_LABELS[idx]}
                  value={value}
                  onChange={(next) =>
                    setPerDay((prev) => {
                      const copy = [...prev];
                      copy[idx] = next;
                      return copy;
                    })
                  }
                />
              ))
            )}

            <Text style={styles.totalLine}>
              Weekly total: {formatHM(totalWeekMinutes)}
            </Text>
          </ScrollView>

          {hasExistingGoal && (
            <Pressable
              onPress={handleClear}
              style={styles.clearButton}
              disabled={submitting}
            >
              <Feather name="trash-2" size={16} color={COLORS.error} />
              <Text style={styles.clearButtonText}>Clear goal</Text>
            </Pressable>
          )}

          <GradientButton
            shape="pill"
            label={submitting ? "Saving..." : "Save Goal"}
            onPress={handleSave}
            disabled={submitting || isLoading}
          >
            <Feather name="check" size={18} color={COLORS.onPrimary} />
          </GradientButton>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ──────────────────────────────────────────────

interface ModeButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function ModeButton({ label, active, onPress }: ModeButtonProps): React.ReactElement {
  return (
    <Pressable
      style={[styles.modeButton, active && styles.modeButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

interface DirectionButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function DirectionButton({
  label,
  active,
  onPress,
}: DirectionButtonProps): React.ReactElement {
  return (
    <Pressable
      style={[
        styles.directionButton,
        active && styles.directionButtonActive,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.directionButtonText,
          active && styles.directionButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface HM {
  h: string;
  m: string;
}

interface HMInputRowProps {
  label: string;
  value: HM;
  onChange: (next: HM) => void;
}

function HMInputRow({ label, value, onChange }: HMInputRowProps): React.ReactElement {
  return (
    <View style={styles.hmRow}>
      <Text style={styles.hmLabel}>{label}</Text>
      <View style={styles.hmInputs}>
        <TextInput
          style={styles.hmInput}
          value={value.h}
          onChangeText={(t) => onChange({ ...value, h: clampNumericText(t, 23) })}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
        />
        <Text style={styles.hmUnit}>h</Text>
        <TextInput
          style={styles.hmInput}
          value={value.m}
          onChangeText={(t) => onChange({ ...value, m: clampNumericText(t, 59) })}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
        />
        <Text style={styles.hmUnit}>m</Text>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────
// Helpers

function emptyPerDay(): HM[] {
  return Array.from({ length: 7 }, () => ({ h: "0", m: "0" }));
}

function minutesToHM(total: number): HM {
  const safe = Math.max(0, Math.floor(total));
  return {
    h: String(Math.floor(safe / 60)),
    m: String(safe % 60),
  };
}

function hmToMinutes(v: HM): number {
  const h = Math.min(23, Math.max(0, parseInt(v.h || "0", 10) || 0));
  const m = Math.min(59, Math.max(0, parseInt(v.m || "0", 10) || 0));
  return h * 60 + m;
}

function clampNumericText(text: string, max: number): string {
  const digits = text.replace(/[^0-9]/g, "");
  if (digits === "") return "";
  const n = Math.min(max, parseInt(digits, 10));
  return String(n);
}

function formatHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0 && m === 0) return "0h";
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

// ──────────────────────────────────────────────

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
    maxHeight: "90%",
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
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
  },
  closeButton: {
    padding: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  modeRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    padding: 4,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceContainerLow,
    marginBottom: SPACING.lg,
  },
  modeButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  modeButtonText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
  },
  modeButtonTextActive: {
    color: COLORS.onSurface,
    fontWeight: "600",
  },
  sectionLabel: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.sm,
  },
  directionRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    padding: 4,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceContainerLow,
    marginBottom: SPACING.xs,
  },
  directionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
    alignItems: "center",
  },
  directionButtonActive: {
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  directionButtonText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
  },
  directionButtonTextActive: {
    color: COLORS.onSurface,
    fontWeight: "600",
  },
  directionHelper: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.lg,
  },
  scroll: {
    flexGrow: 0,
    marginBottom: SPACING.lg,
  },
  scrollContent: {
    gap: SPACING.sm,
  },
  hmRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  hmLabel: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
  },
  hmInputs: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  hmInput: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    minWidth: 44,
    textAlign: "center",
  },
  hmUnit: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
    marginRight: SPACING.xs,
  },
  totalLine: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
    textAlign: "center",
    marginTop: SPACING.sm,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  clearButtonText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.error,
  },
});
