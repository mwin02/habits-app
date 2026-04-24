import { Feather } from "@expo/vector-icons";
import React, { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";

export type SettingRowProps = {
  title: string;
  description?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  iconBackground?: string;
  iconChildren?: ReactNode;
};

export function SettingRow({
  title,
  description,
  trailing,
  onPress,
  disabled,
  iconBackground,
  iconChildren,
}: SettingRowProps): React.ReactElement {
  const isNavigation = typeof onPress === "function";

  const content = (
    <>
      {iconChildren ? (
        <View
          style={[
            styles.iconBubble,
            iconBackground ? { backgroundColor: iconBackground } : null,
          ]}
        >
          {iconChildren}
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text
          style={[styles.rowTitle, disabled && styles.disabledText]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={[styles.rowSummary, disabled && styles.disabledText]}
            numberOfLines={2}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {trailing ?? (isNavigation ? (
        <Feather
          name="chevron-right"
          size={20}
          color={COLORS.onSurfaceVariant}
        />
      ) : null)}
    </>
  );

  if (isNavigation) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.row,
          pressed && styles.rowPressed,
          disabled && styles.rowDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>{content}</View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  rowPressed: {
    backgroundColor: COLORS.surfaceContainer,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surfaceContainer,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
  },
  rowSummary: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
  },
  disabledText: {
    color: COLORS.onSurfaceVariant,
  },
});
