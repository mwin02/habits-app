import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EditCategoryModal } from "@/components/category/edit-category-modal";
import { CategoryIcon } from "@/components/common/category-icon";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import type { CategoryWithActivities } from "@/db/models";
import { useCategoriesWithActivities } from "@/hooks/useCategoriesWithActivities";

interface ManageCategoryRowProps {
  category: CategoryWithActivities;
  onEdit: (category: CategoryWithActivities) => void;
}

function ManageCategoryRow({
  category,
  onEdit,
}: ManageCategoryRowProps): React.ReactElement {
  const activityCount = category.activities.length;
  return (
    <Pressable style={styles.row} onPress={() => onEdit(category)}>
      <View
        style={[styles.iconBadge, { backgroundColor: category.color + "22" }]}
      >
        <CategoryIcon
          icon={category.icon ?? "circle"}
          size={20}
          color={category.color}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {category.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {activityCount} {activityCount === 1 ? "activity" : "activities"}
        </Text>
      </View>
      <Pressable
        onPress={() => onEdit(category)}
        style={styles.editButton}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${category.name}`}
      >
        <Feather name="edit-2" size={16} color={COLORS.primary} />
      </Pressable>
    </Pressable>
  );
}

export default function ManageCategoriesScreen(): React.ReactElement {
  const { categories, isLoading } = useCategoriesWithActivities();
  const [editing, setEditing] = useState<CategoryWithActivities | null>(null);

  const handleEdit = useCallback((category: CategoryWithActivities): void => {
    setEditing(category);
  }, []);

  const renderRow = useCallback(
    ({ item }: { item: CategoryWithActivities }): React.ReactElement => (
      <ManageCategoryRow category={item} onEdit={handleEdit} />
    ),
    [handleEdit],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <Stack.Screen options={{ title: "Manage Categories" }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Manage Categories" }} />

      <View style={styles.header}>
        <Text style={styles.title}>Manage Categories</Text>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No categories</Text>
          </View>
        }
      />

      <EditCategoryModal
        visible={editing !== null}
        onClose={() => setEditing(null)}
        category={editing}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING["4xl"],
    gap: SPACING.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
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
  emptyState: {
    alignItems: "center",
    paddingVertical: SPACING["4xl"],
    gap: SPACING.sm,
  },
  emptyTitle: {
    ...TYPOGRAPHY.heading,
    color: COLORS.onSurface,
  },
});
