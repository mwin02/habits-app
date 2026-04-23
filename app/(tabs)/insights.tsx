import { ActivityBreakdown } from "@/components/insights/activity-breakdown";
import { ActualVsIdeal } from "@/components/insights/actual-vs-ideal";
import { CategoryBreakdown } from "@/components/insights/category-breakdown";
import { MonthNavHeader } from "@/components/insights/month-nav-header";
import { PeriodToggle } from "@/components/insights/period-toggle";
import { TrackingCoverage } from "@/components/insights/tracking-coverage";
import { WeekNavHeader } from "@/components/insights/week-nav-header";
import { DateHeader } from "@/components/timeline/date-header";
import { WeekStrip } from "@/components/timeline/week-strip";
import { COLORS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import { useInsightsData, type InsightsPeriod } from "@/hooks/useInsightsData";
import { getCurrentTimezone, getTodayDate } from "@/lib/timezone";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const WEEK_STRIP_HEIGHT = 88;

export default function InsightsScreen(): React.ReactElement {
  const today = getTodayDate(getCurrentTimezone());
  const [period, setPeriod] = useState<InsightsPeriod>("daily");
  const [dailyDate, setDailyDate] = useState<string>(today);
  const [weeklyDate, setWeeklyDate] = useState<string>(today);
  const [monthlyDate, setMonthlyDate] = useState<string>(today);

  const activeDate =
    period === "daily"
      ? dailyDate
      : period === "weekly"
        ? weeklyDate
        : monthlyDate;
  const { categoryInsights, coverage, totalTrackedMinutes, isLoading } =
    useInsightsData(activeDate, period);

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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <PeriodToggle period={period} onPeriodChange={setPeriod} />

      {period === "daily" ? (
        <DateHeader selectedDate={dailyDate} onDateChange={setDailyDate} />
      ) : period === "weekly" ? (
        <WeekNavHeader selectedDate={weeklyDate} onDateChange={setWeeklyDate} />
      ) : (
        <MonthNavHeader selectedDate={monthlyDate} onDateChange={setMonthlyDate} />
      )}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : categoryInsights.length === 0 ? (
        <>
          {period === "daily" && (
            <WeekStrip selectedDate={dailyDate} onDateChange={setDailyDate} />
          )}
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptyBody}>
              Start tracking activities to see your insights here.
            </Text>
          </View>
        </>
      ) : (
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
          {period === "daily" && (
            <Animated.View
              style={[
                styles.weekStripWrapper,
                { height: weekStripHeight, opacity: weekStripOpacity },
              ]}
            >
              <WeekStrip selectedDate={dailyDate} onDateChange={setDailyDate} />
            </Animated.View>
          )}

          <CategoryBreakdown
            categoryInsights={categoryInsights}
            totalTrackedMinutes={totalTrackedMinutes}
          />

          <ActualVsIdeal categoryInsights={categoryInsights} />

          <ActivityBreakdown
            categoryInsights={categoryInsights}
            selectedDate={activeDate}
            period={period}
          />

          <TrackingCoverage coverage={coverage} period={period} />
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loader: {
    marginTop: SPACING["3xl"],
  },
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
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING["3xl"],
  },
  emptyTitle: {
    ...TYPOGRAPHY.heading,
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },
  emptyBody: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
    textAlign: "center",
  },
});
