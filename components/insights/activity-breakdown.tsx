import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DonutChart, type DonutSlice } from './donut-chart';
import { useActivityBreakdown } from '@/hooks/useActivityBreakdown';
import type { CategoryInsight } from '@/db/models';
import type { InsightsPeriod } from '@/hooks/useInsightsData';
import { formatDuration } from '@/lib/timezone';
import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface ActivityBreakdownProps {
  categoryInsights: CategoryInsight[];
  selectedDate: string;
  period: InsightsPeriod;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function ActivityBreakdown({
  categoryInsights,
  selectedDate,
  period,
}: ActivityBreakdownProps): React.ReactElement {
  // Auto-select the category with the most tracked time
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // When category insights change, auto-select the top category
  useEffect(() => {
    if (categoryInsights.length > 0) {
      const topCategory = categoryInsights[0]; // already sorted by most time
      setSelectedCategoryId(topCategory.categoryId);
    } else {
      setSelectedCategoryId(null);
    }
  }, [categoryInsights]);

  const selectedCategory = categoryInsights.find(
    (c) => c.categoryId === selectedCategoryId,
  );
  const categoryColor = selectedCategory?.categoryColor ?? COLORS.primary;

  const { activities, totalSeconds, isLoading } = useActivityBreakdown(
    selectedCategoryId,
    categoryColor,
    selectedDate,
    period,
  );

  const handleCategoryPress = useCallback((categoryId: string) => {
    setSelectedCategoryId(categoryId);
  }, []);

  if (categoryInsights.length === 0) {
    return <></>;
  }

  // Build donut slices
  const donutSlices: DonutSlice[] = activities.map((a) => ({
    value: a.totalSeconds,
    color: a.color,
  }));

  const centerLabel = totalSeconds > 0 ? formatDuration(totalSeconds) : '0m';

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>ACTIVITY BREAKDOWN</Text>

      {/* Category selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectorContent}
        style={styles.selectorScroll}
      >
        {categoryInsights.map((cat) => {
          const isSelected = cat.categoryId === selectedCategoryId;
          return (
            <Pressable
              key={cat.categoryId}
              onPress={() => handleCategoryPress(cat.categoryId)}
              style={[
                styles.categoryPill,
                isSelected && { backgroundColor: cat.categoryColor + '20' },
              ]}
            >
              <View
                style={[styles.categoryDot, { backgroundColor: cat.categoryColor }]}
              />
              <Text
                style={[
                  styles.categoryPillText,
                  isSelected && { color: cat.categoryColor, fontFamily: FONTS.jakartaBold },
                ]}
                numberOfLines={1}
              >
                {cat.categoryName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Donut chart + legend */}
      {!isLoading && activities.length > 0 ? (
        <>
          <View style={styles.chartContainer}>
            <DonutChart
              slices={donutSlices}
              size={180}
              strokeWidth={28}
              centerLabel={centerLabel}
              centerSubLabel="total"
            />
          </View>

          {/* Activity legend */}
          <View style={styles.legendContainer}>
            {activities.map((activity) => (
              <View key={activity.activityId} style={styles.legendRow}>
                <View style={styles.legendLeft}>
                  <View
                    style={[styles.legendDot, { backgroundColor: activity.color }]}
                  />
                  <Text style={styles.legendName} numberOfLines={1}>
                    {activity.activityName}
                  </Text>
                </View>
                <View style={styles.legendRight}>
                  <Text style={styles.legendDuration}>
                    {formatDuration(activity.totalSeconds)}
                  </Text>
                  <Text style={styles.legendPercent}>{activity.percentage}%</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : !isLoading ? (
        <Text style={styles.emptyText}>
          No activities tracked for this category.
        </Text>
      ) : null}
    </View>
  );
}

// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xl,
    padding: SPACING['2xl'],
  },
  sectionLabel: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.md,
  },
  // Category selector
  selectorScroll: {
    marginHorizontal: -SPACING['2xl'],
    marginBottom: SPACING.xl,
  },
  selectorContent: {
    paddingHorizontal: SPACING['2xl'],
    gap: SPACING.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainer,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryPillText: {
    fontFamily: FONTS.jakartaMedium,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.onSurfaceVariant,
  },
  // Chart
  chartContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  // Legend
  legendContainer: {
    gap: SPACING.md,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
    flex: 1,
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  legendDuration: {
    fontFamily: FONTS.jakartaMedium,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.onSurfaceVariant,
  },
  legendPercent: {
    fontFamily: FONTS.jakartaSemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.onSurface,
    minWidth: 32,
    textAlign: 'right',
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },
});
