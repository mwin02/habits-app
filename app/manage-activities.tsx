import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";

import { CategoryIcon } from "@/components/common/category-icon";
import { GradientButton } from "@/components/common/gradient-button";
import { CreateActivityModal } from "@/components/timer/create-activity-modal";
import { ManageActivityRow } from "@/components/manage/manage-activity-row";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import type { ActivityItem, CategoryWithActivities } from "@/db/models";
import { archiveActivity } from "@/db/queries";
import { useCategoriesWithActivities } from "@/hooks/useCategoriesWithActivities";

export default function ManageActivitiesScreen(): React.ReactElement {
  const { categories, isLoading } = useCategoriesWithActivities();
  const [createVisible, setCreateVisible] = useState(false);
  const [editing, setEditing] = useState<ActivityItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  const handleDelete = useCallback((activity: ActivityItem): void => {
    Alert.alert(
      `Archive "${activity.name}"?`,
      "Past time entries will be preserved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              await archiveActivity(activity.id);
            } catch (err) {
              console.error("Failed to archive activity", err);
            }
          },
        },
      ],
    );
  }, []);

  const handleRename = useCallback((activity: ActivityItem): void => {
    setEditing(activity);
  }, []);

  const handleCategoryPress = useCallback((categoryId: string): void => {
    setSelectedCategoryId((prev) => (prev === categoryId ? null : categoryId));
  }, []);

  // All activities, filtered to selected category (or all categories)
  const visibleActivities = useMemo((): ActivityItem[] => {
    const result: ActivityItem[] = [];
    for (const category of categories) {
      if (selectedCategoryId && category.id !== selectedCategoryId) continue;
      for (const activity of category.activities) {
        result.push(activity);
      }
    }
    return result;
  }, [categories, selectedCategoryId]);

  // Build rows of 2 for the horizontal scrolling category grid
  const categoryRows: CategoryWithActivities[][] = useMemo(() => {
    const rows: CategoryWithActivities[][] = [];
    for (let i = 0; i < categories.length; i += 2) {
      rows.push(categories.slice(i, i + 2));
    }
    return rows;
  }, [categories]);

  const renderActivity = useCallback(
    ({ item }: { item: ActivityItem }): React.ReactElement => (
      <ManageActivityRow
        activity={item}
        onRename={handleRename}
        onDelete={handleDelete}
      />
    ),
    [handleRename, handleDelete],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <Stack.Screen options={{ title: "Manage Activities" }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Manage Activities" }} />

      <View style={styles.content}>
        {/* Category selector — horizontal scroll, 2 rows */}
        <Text style={styles.sectionLabel}>Select Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
          style={styles.categoryScroll}
        >
          {categoryRows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.categoryColumn}>
              {row.map((category) => {
                const isSelected = category.id === selectedCategoryId;
                return (
                  <Pressable
                    key={category.id}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: isSelected
                          ? category.color + "26"
                          : category.color + "12",
                      },
                    ]}
                    onPress={() => handleCategoryPress(category.id)}
                  >
                    <CategoryIcon
                      icon={category.icon ?? "circle"}
                      size={22}
                      color={category.color}
                    />
                    <Text
                      style={[
                        styles.categoryCardName,
                        { color: category.color },
                      ]}
                      numberOfLines={1}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Activities list */}
        <View style={styles.activitiesHeader}>
          <Text style={styles.sectionLabel}>
            {selectedCategoryId ? "Activities" : "All Activities"}
          </Text>
          {selectedCategoryId && (
            <Pressable onPress={() => setSelectedCategoryId(null)}>
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          )}
        </View>

        <FlatList
          data={visibleActivities}
          keyExtractor={(item) => item.id}
          renderItem={renderActivity}
          style={styles.activityList}
          contentContainerStyle={styles.activityListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No activities</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to add one.
              </Text>
            </View>
          }
        />
      </View>

      {/* Floating + button */}
      <View style={styles.fabWrapper} pointerEvents="box-none">
        <GradientButton
          shape="circle"
          size={60}
          onPress={() => setCreateVisible(true)}
        >
          <Feather name="plus" size={28} color={COLORS.onPrimary} />
        </GradientButton>
      </View>

      <CreateActivityModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        categories={categories}
        initialCategoryId={selectedCategoryId}
      />

      <CreateActivityModal
        visible={editing !== null}
        onClose={() => setEditing(null)}
        categories={categories}
        initialActivity={editing}
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
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  sectionLabel: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.md,
  },
  categoryScroll: {
    flexGrow: 0,
    marginBottom: SPACING["2xl"],
  },
  categoryScrollContent: {
    gap: SPACING.md,
  },
  categoryColumn: {
    gap: SPACING.md,
  },
  categoryCard: {
    width: 160,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  categoryCardName: {
    ...TYPOGRAPHY.titleMd,
    flexShrink: 1,
  },
  activitiesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  viewAllText: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.primary,
  },
  activityList: {
    flex: 1,
  },
  activityListContent: {
    gap: SPACING.sm,
    paddingBottom: 120,
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
  fabWrapper: {
    position: "absolute",
    right: SPACING.xl,
    bottom: SPACING.xl,
  },
});
