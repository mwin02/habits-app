import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";

export interface ThresholdOption {
  label: string;
  value: number | null;
}

export const THRESHOLD_PRESETS: readonly ThresholdOption[] = [
  { label: "Auto", value: null },
  { label: "45m", value: 45 * 60 },
  { label: "1h", value: 60 * 60 },
  { label: "2h", value: 120 * 60 },
  { label: "4h", value: 240 * 60 },
] as const;

export interface ThresholdPickerProps {
  value: number | null;
  onChange: (next: number | null) => void;
  disabled?: boolean;
}

export function ThresholdPicker({
  value,
  onChange,
  disabled,
}: ThresholdPickerProps): React.ReactElement {
  const matchedValue = THRESHOLD_PRESETS.some((p) => p.value === value)
    ? value
    : null;

  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      {THRESHOLD_PRESETS.map((preset) => {
        const selected = preset.value === matchedValue;
        return (
          <Pressable
            key={preset.label}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              pressed && !selected && styles.chipPressed,
            ]}
            onPress={() => onChange(preset.value)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: !!disabled }}
          >
            <Text
              style={[
                styles.chipLabel,
                selected && styles.chipLabelSelected,
              ]}
            >
              {preset.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: SPACING.sm,
    flexWrap: "wrap",
  },
  rowDisabled: {
    opacity: 0.55,
  },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  chipPressed: {
    backgroundColor: COLORS.surfaceContainer,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
  },
  chipLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
  },
  chipLabelSelected: {
    color: COLORS.onPrimary,
  },
});
