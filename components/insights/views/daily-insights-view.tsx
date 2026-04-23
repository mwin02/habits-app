import { ActivityBreakdown } from "@/components/insights/activity-breakdown";
import { ActualVsIdeal } from "@/components/insights/actual-vs-ideal";
import { CategoryBreakdown } from "@/components/insights/category-breakdown";
import { DayRhythmStrip } from "@/components/insights/day-rhythm-strip";
import { TrackingCoverage } from "@/components/insights/tracking-coverage";
import { WeekStrip } from "@/components/timeline/week-strip";
import { SPACING } from "@/constants/theme";
import type { CategoryInsight, DayCoverage } from "@/db/models";
import React, { useRef } from "react";
import { Animated, StyleSheet } from "react-native";

const WEEK_STRIP_HEIGHT = 88;

interface DailyInsightsViewProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  categoryInsights: CategoryInsight[];
  coverage: DayCoverage;
  totalTrackedMinutes: number;
}

export function DailyInsightsView({
  selectedDate,
  onDateChange,
  categoryInsights,
  coverage,
  totalTrackedMinutes,
}: DailyInsightsViewProps): React.ReactElement {
  const scrollY = useRef(new Animated.Value(0)).current;
  const weekStripHeight = scrollY.interpolate({
    inputRange: [0, WEEK_STRIP_HEIGHT],
    outputRange: [WEEK_STRIP_HEIGHT, 0],
    extrapolate: "clamp",
  });
  const weekStripOpacity = scrollY.interpolate({
    inputRange: [0, WEEK_STRIP_HEIGHT * 0.6],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <Animated.ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false },
      )}
      scrollEventThrottle={16}
    >
      <Animated.View
        style={[
          styles.weekStripWrapper,
          { height: weekStripHeight, opacity: weekStripOpacity },
        ]}
      >
        <WeekStrip selectedDate={selectedDate} onDateChange={onDateChange} />
      </Animated.View>

      <DayRhythmStrip date={selectedDate} />

      <CategoryBreakdown
        categoryInsights={categoryInsights}
        totalTrackedMinutes={totalTrackedMinutes}
      />

      <ActualVsIdeal categoryInsights={categoryInsights} />

      <ActivityBreakdown
        categoryInsights={categoryInsights}
        selectedDate={selectedDate}
        period="daily"
      />

      <TrackingCoverage coverage={coverage} period="daily" />
    </Animated.ScrollView>
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
  weekStripWrapper: {
    marginHorizontal: -SPACING.xl,
    overflow: "hidden",
  },
});
