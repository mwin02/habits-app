import { ActiveDot } from "@/components/common/active-dot";
import { CategoryIcon } from "@/components/common/category-icon";
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "@/constants/theme";
import { formatDuration } from "@/lib/timezone";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

/** Fixed rendered height of the chip — used by callers for pixel-precise
 *  placement relative to the current-time indicator. */
export const ACTIVE_CHIP_HEIGHT = 48;

/** Which edge of the chip is attached to the now-indicator line.
 *  - 'top': chip sits below the line, its top edge touches it.
 *  - 'bottom': chip sits above the line, its bottom edge touches it. */
export type ActiveChipAttachment = "top" | "bottom";

interface ActiveSessionChipProps {
  activityName: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string | null;
  startedAt: Date;
  liveNow: Date;
  attachment: ActiveChipAttachment;
  onPress: () => void;
}

/**
 * A horizontal pill-shaped card that surfaces the currently running activity
 * at the timeline's "now" indicator line. It's visually fused with the
 * indicator by sharing its primary color and flattening the edge that
 * attaches to the line, so the two elements read as one combined unit.
 */
export function ActiveSessionChip({
  activityName,
  categoryName,
  categoryColor,
  categoryIcon,
  startedAt,
  liveNow,
  attachment,
  onPress,
}: ActiveSessionChipProps): React.ReactElement {
  const elapsedSeconds = Math.max(
    0,
    Math.round((liveNow.getTime() - startedAt.getTime()) / 1000),
  );

  // Flatten the attached edge so the chip border merges with the indicator
  // line into a single continuous shape.
  const attachmentStyle =
    attachment === "top"
      ? {
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderTopWidth: 0,
        }
      : {
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          borderBottomWidth: 0,
        };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        attachmentStyle,
        pressed && styles.pressed,
      ]}
    >
      {/* Category color accent bar on the left edge */}
      <View
        style={[styles.categoryAccent, { backgroundColor: categoryColor }]}
      />
      <View style={styles.left}>
        <CategoryIcon icon={categoryIcon} size={16} color={categoryColor} />
        <Text style={styles.activityName} numberOfLines={1}>
          {activityName}
        </Text>
        <Text
          style={[styles.categoryBadge, { color: categoryColor }]}
          numberOfLines={1}
        >
          {categoryName}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.duration}>{formatDuration(elapsedSeconds)}</Text>
        <ActiveDot />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: ACTIVE_CHIP_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: SPACING.md + 6, // extra room for the category accent bar
    paddingRight: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    gap: SPACING.sm,
    overflow: "hidden",
    ...SHADOWS.ambient,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  categoryAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flex: 1,
    minWidth: 0,
  },
  activityName: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
    flexShrink: 1,
  },
  categoryBadge: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  duration: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
    fontVariant: ["tabular-nums"],
  },
});
