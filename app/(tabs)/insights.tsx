import { MonthNavHeader } from "@/components/insights/month-nav-header";
import { PeriodToggle } from "@/components/insights/period-toggle";
import { DailyInsightsView } from "@/components/insights/views/daily-insights-view";
import { MonthlyInsightsView } from "@/components/insights/views/monthly-insights-view";
import { WeeklyInsightsView } from "@/components/insights/views/weekly-insights-view";
import { WeekNavHeader } from "@/components/insights/week-nav-header";
import { DateHeader } from "@/components/timeline/date-header";
import { WeekStrip } from "@/components/timeline/week-strip";
import { COLORS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import { useInsightsData, type InsightsPeriod } from "@/hooks/useInsightsData";
import { getCurrentTimezone, getTodayDate } from "@/lib/timezone";
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

  const isEmpty = !isLoading && categoryInsights.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <PeriodToggle period={period} onPeriodChange={setPeriod} />

      {period === "daily" ? (
        <DateHeader selectedDate={dailyDate} onDateChange={setDailyDate} />
      ) : period === "weekly" ? (
        <WeekNavHeader selectedDate={weeklyDate} onDateChange={setWeeklyDate} />
      ) : (
        <MonthNavHeader
          selectedDate={monthlyDate}
          onDateChange={setMonthlyDate}
        />
      )}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : isEmpty ? (
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
      ) : period === "daily" ? (
        <DailyInsightsView
          selectedDate={dailyDate}
          onDateChange={setDailyDate}
          categoryInsights={categoryInsights}
          coverage={coverage}
          totalTrackedMinutes={totalTrackedMinutes}
        />
      ) : period === "weekly" ? (
        <WeeklyInsightsView
          selectedDate={weeklyDate}
          categoryInsights={categoryInsights}
          coverage={coverage}
          totalTrackedMinutes={totalTrackedMinutes}
        />
      ) : (
        <MonthlyInsightsView
          selectedDate={monthlyDate}
          categoryInsights={categoryInsights}
          coverage={coverage}
          totalTrackedMinutes={totalTrackedMinutes}
        />
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
