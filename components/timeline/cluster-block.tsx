import { CategoryIcon } from "@/components/common/category-icon";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import type { TimelineCluster } from "@/hooks/useTimelineData";
import { formatDuration } from "@/lib/timezone";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface ClusterBlockProps {
  cluster: TimelineCluster;
  height: number;
  expanded: boolean;
  onToggle: () => void;
  onEntryPress: (entryId: string) => void;
}

export function ClusterBlock({
  cluster,
  height,
  expanded,
  onToggle,
  onEntryPress,
}: ClusterBlockProps): React.ReactElement {
  if (expanded) {
    return (
      <View style={styles.expandedContainer}>
        <Pressable onPress={onToggle} style={styles.collapseHeader}>
          <Text style={styles.collapseLabel}>
            {cluster.entries.length} activities
          </Text>
          <Feather
            name="chevron-up"
            size={14}
            color={COLORS.onSurfaceVariant}
          />
        </Pressable>
        {cluster.entries.map((entry) => (
          <Pressable
            key={entry.id}
            onPress={() => onEntryPress(entry.id)}
            style={({ pressed }) => [
              styles.expandedRow,
              { borderLeftColor: entry.categoryColor },
              pressed && styles.rowPressed,
            ]}
          >
            <CategoryIcon
              icon={entry.categoryIcon}
              size={14}
              color={entry.categoryColor}
            />
            <Text style={styles.expandedName} numberOfLines={1}>
              {entry.activityName}
            </Text>
            <Text style={styles.expandedDuration}>
              {entry.durationSeconds != null
                ? formatDuration(entry.durationSeconds)
                : "—"}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  // Collect unique category colors for the dot indicators
  const uniqueColors = [
    ...new Set(cluster.entries.map((e) => e.categoryColor)),
  ];

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.collapsedContainer,
        { height },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.collapsedContent}>
        <View style={styles.dotRow}>
          {uniqueColors.slice(0, 4).map((color) => (
            <View
              key={color}
              style={[styles.colorDot, { backgroundColor: color }]}
            />
          ))}
        </View>
        <Text style={styles.summaryText}>
          {cluster.entries.length} activities
        </Text>
        <Text style={styles.summaryDuration}>
          {formatDuration(cluster.totalDurationSeconds)}
        </Text>
      </View>
      <Feather
        name="chevron-down"
        size={14}
        color={COLORS.onSurfaceVariant + "80"}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Collapsed state
  collapsedContainer: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + "26",
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  collapsedContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flex: 1,
  },
  dotRow: {
    flexDirection: "row",
    gap: 4,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryText: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
  },
  summaryDuration: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
  },
  // Expanded state
  expandedContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + "26",
    overflow: "hidden",
    shadowColor: COLORS.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  collapseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  collapseLabel: {
    ...TYPOGRAPHY.labelSm,
    color: COLORS.onSurfaceVariant,
  },
  expandedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderLeftWidth: 3,
  },
  rowPressed: {
    backgroundColor: COLORS.surfaceContainer + "80",
  },
  expandedName: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
    flex: 1,
  },
  expandedDuration: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
  },
});
