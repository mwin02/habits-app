import { ActivityBreakdown } from "@/components/insights/activity-breakdown";
import { ActualVsIdeal } from "@/components/insights/actual-vs-ideal";
import { CalendarHeatmap } from "@/components/insights/calendar-heatmap";
import { CategoryBreakdown } from "@/components/insights/category-breakdown";
import { FourWeekTrend } from "@/components/insights/four-week-trend";
import { TopActivitiesRanked } from "@/components/insights/top-activities-ranked";
import { TrackingCoverage } from "@/components/insights/tracking-coverage";
import { SPACING } from "@/constants/theme";
import type { CategoryInsight, DayCoverage } from "@/db/models";
import React from "react";
import { ScrollView, StyleSheet } from "react-native";

interface MonthlyInsightsViewProps {
  selectedDate: string;
  categoryInsights: CategoryInsight[];
  coverage: DayCoverage;
  totalTrackedMinutes: number;
  onDayPress: (date: string) => void;
}

export function MonthlyInsightsView({
  selectedDate,
  categoryInsights,
  coverage,
  totalTrackedMinutes,
  onDayPress,
}: MonthlyInsightsViewProps): React.ReactElement {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <CalendarHeatmap monthDate={selectedDate} onDayPress={onDayPress} />

      <CategoryBreakdown
        categoryInsights={categoryInsights}
        totalTrackedMinutes={totalTrackedMinutes}
      />

      <ActualVsIdeal categoryInsights={categoryInsights} />

      <ActivityBreakdown
        categoryInsights={categoryInsights}
        selectedDate={selectedDate}
        period="monthly"
      />

      <FourWeekTrend monthDate={selectedDate} />

      <TopActivitiesRanked monthDate={selectedDate} />

      <TrackingCoverage coverage={coverage} period="monthly" />
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
