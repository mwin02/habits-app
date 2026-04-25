import React, { useCallback, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Swipeable, RectButton } from "react-native-gesture-handler";
import type { ActivityItem } from "@/db/models";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";

interface ManageActivityRowProps {
  activity: ActivityItem;
  onRename: (activity: ActivityItem) => void;
  onDelete: (activity: ActivityItem) => void;
}

export function ManageActivityRow({
  activity,
  onRename,
  onDelete,
}: ManageActivityRowProps): React.ReactElement {
  const swipeableRef = useRef<Swipeable>(null);

  const handleArchivePress = useCallback((): void => {
    swipeableRef.current?.close();
    onDelete(activity);
  }, [activity, onDelete]);

  const renderRightActions = useCallback(
    (): React.ReactElement => (
      <RectButton style={styles.archiveAction} onPress={handleArchivePress}>
        <Feather name="archive" size={20} color={COLORS.onPrimary} />
        <Text style={styles.archiveLabel}>Archive</Text>
      </RectButton>
    ),
    [handleArchivePress],
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      <Pressable style={styles.row} onPress={() => onRename(activity)}>
        <View
          style={[styles.dot, { backgroundColor: activity.categoryColor }]}
        />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {activity.name}
          </Text>
          <Text
            style={[styles.category, { color: activity.categoryColor }]}
            numberOfLines={1}
          >
            {activity.categoryName}
          </Text>
        </View>
        <Pressable
          onPress={() => onRename(activity)}
          style={styles.editButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${activity.name}`}
        >
          <Feather name="edit-2" size={16} color={COLORS.primary} />
        </Pressable>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  info: {
    flex: 1,
  },
  name: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
  },
  category: {
    ...TYPOGRAPHY.bodySmall,
    marginTop: 2,
  },
  editButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  archiveAction: {
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
    width: 100,
    borderTopRightRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
    marginLeft: SPACING.sm,
    gap: 4,
  },
  archiveLabel: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onPrimary,
    fontSize: 11,
  },
});
