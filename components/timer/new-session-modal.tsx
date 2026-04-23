import { CategoryIcon } from "@/components/common/category-icon";
import { GradientButton } from "@/components/common/gradient-button";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import type { ActivityItem, CategoryWithActivities } from "@/db/models";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
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

interface NewSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onStartActivity: (activityId: string) => void;
  categories: CategoryWithActivities[];
}

export function NewSessionModal({
  visible,
  onClose,
  onStartActivity,
  categories,
}: NewSessionModalProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Reset state when modal opens/closes
  const handleClose = useCallback((): void => {
    setSelectedCategoryId(null);
    setSelectedActivityId(null);
    setSearchQuery("");
    onClose();
  }, [onClose]);

  const handleStart = useCallback((): void => {
    if (selectedActivityId) {
      onStartActivity(selectedActivityId);
      setSelectedCategoryId(null);
      setSelectedActivityId(null);
      setSearchQuery("");
    }
  }, [selectedActivityId, onStartActivity]);

  const handleCategoryPress = useCallback((categoryId: string): void => {
    setSelectedCategoryId((prev) => (prev === categoryId ? null : categoryId));
    setSelectedActivityId(null);
  }, []);

  // Filter activities based on selected category and search query
  const filteredActivities = useMemo((): ActivityItem[] => {
    const query = searchQuery.toLowerCase().trim();
    const allActivities: ActivityItem[] = [];

    for (const category of categories) {
      if (selectedCategoryId && category.id !== selectedCategoryId) continue;

      for (const activity of category.activities) {
        if (query && !activity.name.toLowerCase().includes(query)) continue;
        allActivities.push(activity);
      }
    }

    return allActivities;
  }, [categories, selectedCategoryId, searchQuery]);

  // Build rows of 2 for the horizontal scrolling grid
  const categoryRows: CategoryWithActivities[][] = [];
  for (let i = 0; i < categories.length; i += 2) {
    categoryRows.push(categories.slice(i, i + 2));
  }

  const renderActivityItem = useCallback(
    ({ item }: { item: ActivityItem }): React.ReactElement => {
      const isSelected = item.id === selectedActivityId;
      return (
        <Pressable
          style={[styles.activityRow, isSelected && styles.activityRowSelected]}
          onPress={() => setSelectedActivityId(item.id)}
        >
          <View
            style={[
              styles.activityDot,
              { backgroundColor: item.categoryColor },
            ]}
          />
          <View style={styles.activityInfo}>
            <Text style={styles.activityName}>{item.name}</Text>
            <Text
              style={[styles.activityCategory, { color: item.categoryColor }]}
            >
              {item.categoryName}
            </Text>
          </View>
          {isSelected && (
            <Feather name="check-circle" size={20} color={COLORS.primary} />
          )}
        </Pressable>
      );
    },
    [selectedActivityId],
  );

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
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Start Activity</Text>
              <Text style={styles.headerSubtitle}>Ready to focus?</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Feather name="x" size={22} color={COLORS.onSurface} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Feather name="search" size={18} color={COLORS.onSurfaceVariant} />
            <TextInput
              style={styles.searchInput}
              placeholder="What are you working on?"
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
          </View>

          {/* Category grid — horizontal scroll, 2 rows */}
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
              {selectedCategoryId ? "Activities" : "Recent Activities"}
            </Text>
            {selectedCategoryId && (
              <Pressable onPress={() => setSelectedCategoryId(null)}>
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            )}
          </View>

          <FlatList
            data={filteredActivities}
            keyExtractor={(item) => item.id}
            renderItem={renderActivityItem}
            style={styles.activityList}
            contentContainerStyle={styles.activityListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />

          {/* Start button */}
          <GradientButton
            shape="pill"
            label="Start Activity"
            onPress={handleStart}
            disabled={!selectedActivityId}
          >
            <Feather name="play" size={18} color={COLORS.onPrimary} />
          </GradientButton>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
    height: "85%",
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
    alignItems: "flex-start",
    marginBottom: SPACING["2xl"],
  },
  headerTitle: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },
  closeButton: {
    padding: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING["2xl"],
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
    padding: 0,
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
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  categoryCardSelected: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  categoryCardName: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
    flexShrink: 1,
  },
  categoryCardNameSelected: {
    color: COLORS.primary,
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
    marginBottom: SPACING.lg,
  },
  activityListContent: {
    gap: SPACING.sm,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  activityRowSelected: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
  },
  activityCategory: {
    ...TYPOGRAPHY.bodySmall,
    marginTop: 2,
  },
});
