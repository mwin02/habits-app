import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PeriodToggle } from '@/components/insights/period-toggle';
import { useInsightsData, type InsightsPeriod } from '@/hooks/useInsightsData';
import { useUIStore } from '@/store/uiStore';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';

export default function InsightsScreen(): React.ReactElement {
  const selectedDate = useUIStore((s) => s.selectedDate);
  const [period, setPeriod] = useState<InsightsPeriod>('daily');
  const { categoryInsights, coverage, totalTrackedMinutes, isLoading } =
    useInsightsData(selectedDate, period);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
      </View>

      <PeriodToggle period={period} onPeriodChange={setPeriod} />

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : categoryInsights.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptyBody}>
            Start tracking activities to see your insights here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Placeholder for cards — will be added in Steps 3-5 */}
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderLabel}>CATEGORY BREAKDOWN</Text>
            <Text style={styles.placeholderValue}>
              {categoryInsights.length} categories tracked
            </Text>
          </View>

          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderLabel}>ACTUAL VS IDEAL</Text>
            <Text style={styles.placeholderValue}>
              {categoryInsights.filter((c) => c.targetMinutes != null).length} categories with goals
            </Text>
          </View>

          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderLabel}>TRACKING COVERAGE</Text>
            <Text style={styles.placeholderValue}>
              {coverage.coveragePercent}% of waking hours
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
  },
  loader: {
    marginTop: SPACING['3xl'],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING['5xl'],
    gap: SPACING.lg,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING['3xl'],
  },
  emptyTitle: {
    ...TYPOGRAPHY.heading,
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },
  emptyBody: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  // Temporary placeholder cards (replaced in Steps 3-5)
  placeholderCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: SPACING['2xl'],
  },
  placeholderLabel: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.sm,
  },
  placeholderValue: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
  },
});
