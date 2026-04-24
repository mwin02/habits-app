import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CategoryIcon } from "@/components/common/category-icon";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import type { CategoryWithActivities } from "@/db/models";
import { useAllCategoryGoalSummaries } from "@/hooks/useAllCategoryGoalSummaries";
import { useCategoriesWithActivities } from "@/hooks/useCategoriesWithActivities";

export default function IdealAllocationsScreen(): React.ReactElement {
  const { categories, isLoading: categoriesLoading } =
    useCategoriesWithActivities();
  const { summariesByCategory, isLoading: summariesLoading } =
    useAllCategoryGoalSummaries();

  const handleCategoryPress = useCallback((category: CategoryWithActivities) => {
    // TODO(Section 3): open goal editor modal.
    Alert.alert(
      category.name,
      "Goal editor coming in the next step.",
      [{ text: "OK" }],
    );
  }, []);

  const isLoading = categoriesLoading || summariesLoading;

  const renderCategory = useCallback(
    ({ item }: { item: CategoryWithActivities }): React.ReactElement => {
      const summary =
        summariesByCategory.get(item.id) ?? { label: "Not set", hasGoal: false };
      return (
        <Pressable
          style={({ pressed }) => [
            styles.row,
            pressed && styles.rowPressed,
          ]}
          onPress={() => handleCategoryPress(item)}
        >
          <View
            style={[styles.iconBubble, { backgroundColor: item.color + "1F" }]}
          >
            <CategoryIcon
              icon={item.icon ?? "circle"}
              size={20}
              color={item.color}
            />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text
              style={[
                styles.rowSummary,
                !summary.hasGoal && styles.rowSummaryMuted,
              ]}
              numberOfLines={1}
            >
              {summary.label}
            </Text>
          </View>
          <Feather
            name="chevron-right"
            size={20}
            color={COLORS.onSurfaceVariant}
          />
        </Pressable>
      );
    },
    [summariesByCategory, handleCategoryPress],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <Stack.Screen options={{ title: "Ideal Allocations" }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Ideal Allocations" }} />

      <View style={styles.header}>
        <Text style={styles.title}>Ideal Allocations</Text>
        <Text style={styles.subtitle}>
          Set how many hours per day you want to spend on each category. Tap a
          category to customise by day of the week.
        </Text>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No categories</Text>
            <Text style={styles.emptySubtitle}>
              Create a category first to set a goal.
            </Text>
          </View>
        }
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
    gap: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
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
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  rowPressed: {
    backgroundColor: COLORS.surfaceContainer,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
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
    color: COLORS.onSurface,
  },
  rowSummaryMuted: {
    color: COLORS.onSurfaceVariant,
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
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
    textAlign: "center",
  },
});
