import { ActivityBreakdown } from "@/components/insights/activity-breakdown";
import { ActualVsIdeal } from "@/components/insights/actual-vs-ideal";
import { CategoryBreakdown } from "@/components/insights/category-breakdown";
import { DayOfWeekBars } from "@/components/insights/day-of-week-bars";
import { TrackingCoverage } from "@/components/insights/tracking-coverage";
import { WeekOverWeekDelta } from "@/components/insights/week-over-week-delta";
import { SPACING } from "@/constants/theme";
import type { CategoryInsight, DayCoverage } from "@/db/models";
import React from "react";
import { ScrollView, StyleSheet } from "react-native";

interface WeeklyInsightsViewProps {
  selectedDate: string;
  categoryInsights: CategoryInsight[];
  coverage: DayCoverage;
  totalTrackedMinutes: number;
}

export function WeeklyInsightsView({
  selectedDate,
  categoryInsights,
  coverage,
  totalTrackedMinutes,
}: WeeklyInsightsViewProps): React.ReactElement {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <DayOfWeekBars weekDate={selectedDate} />

      <WeekOverWeekDelta weekDate={selectedDate} />

      <CategoryBreakdown
        categoryInsights={categoryInsights}
        totalTrackedMinutes={totalTrackedMinutes}
      />

      <ActualVsIdeal categoryInsights={categoryInsights} />

      <ActivityBreakdown
        categoryInsights={categoryInsights}
        selectedDate={selectedDate}
        period="weekly"
      />

      <TrackingCoverage coverage={coverage} period="weekly" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING["5xl"],
    gap: SPACING.lg,
  },
});
