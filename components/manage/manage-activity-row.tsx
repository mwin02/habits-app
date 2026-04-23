import React, { useCallback } from "react";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
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
  const openMenu = useCallback((): void => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Rename", "Delete"],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
          title: activity.name,
        },
        (index) => {
          if (index === 1) onRename(activity);
          else if (index === 2) onDelete(activity);
        },
      );
    } else {
      Alert.alert(activity.name, undefined, [
        { text: "Rename", onPress: () => onRename(activity) },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(activity),
        },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }, [activity, onRename, onDelete]);

  return (
    <View style={styles.row}>
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
        onPress={openMenu}
        style={styles.menuButton}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Manage ${activity.name}`}
      >
        <Feather
          name="more-horizontal"
          size={20}
          color={COLORS.onSurfaceVariant}
        />
      </Pressable>
    </View>
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
  menuButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.full,
  },
});
