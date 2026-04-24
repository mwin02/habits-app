import type { CategoryInsight, DayCoverage } from "@/db/models";
import {
  IDEAL_ALLOCATIONS_QUERY,
  INSIGHTS_CATEGORY_QUERY,
  type IdealAllocationRow,
  type InsightsCategoryRow,
} from "@/db/queries";
import { getCurrentTimezone, getEndOfDay, getStartOfDay } from "@/lib/timezone";
import { useQuery } from "@powersync/react";
import { useMemo } from "react";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type InsightsPeriod = "daily" | "weekly" | "monthly";

export interface UseInsightsDataResult {
  /** Per-category breakdown with actual vs ideal */
  categoryInsights: CategoryInsight[];
  /** Tracking coverage for the period */
  coverage: DayCoverage;
  /** Total tracked minutes across all categories */
  totalTrackedMinutes: number;
  /** Whether the query is still loading */
  isLoading: boolean;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Minutes per day (24h) */
export const MINUTES_PER_DAY = 1440;

/**
 * Get the Monday (start) and Sunday (end) of the week containing the given date.
 * Returns YYYY-MM-DD strings.
 */
/**
 * Get the first and last day of the calendar month containing the given date.
 * Returns YYYY-MM-DD strings.
 */
export function getMonthRange(dateStr: string): {
  monthStart: string;
  monthEnd: string;
} {
  const [y, m] = dateStr.split("-").map(Number);
  const firstDay = new Date(Date.UTC(y, m - 1, 1, 12));
  const lastDay = new Date(Date.UTC(y, m, 0, 12)); // day 0 of next month = last day of this month
  const fmt = (d: Date): string => d.toISOString().slice(0, 10);
  return { monthStart: fmt(firstDay), monthEnd: fmt(lastDay) };
}

export function getWeekRange(dateStr: string): {
  weekStart: string;
  weekEnd: string;
} {
  const date = new Date(`${dateStr}T12:00:00.000Z`); // noon to avoid DST issues
  const day = date.getUTCDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const fmt = (d: Date): string => d.toISOString().slice(0, 10);
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) };
}

/**
 * Count the number of days in a range (inclusive), capped at today.
 */
function countDaysInRange(
  startDate: string,
  endDate: string,
  todayDate: string,
): number {
  const effectiveEnd = endDate > todayDate ? todayDate : endDate;
  if (effectiveEnd < startDate) return 0;
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${effectiveEnd}T00:00:00.000Z`);
  return (
    Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
  );
}

/**
 * Enumerate YYYY-MM-DD strings in [startDate, endDate] (inclusive), capped at
 * todayDate. Returns [] when the window ends before it starts.
 */
function enumerateDaysInRange(
  startDate: string,
  endDate: string,
  todayDate: string,
): string[] {
  const effectiveEnd = endDate > todayDate ? todayDate : endDate;
  if (effectiveEnd < startDate) return [];
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = effectiveEnd.split("-").map(Number);
  const startMs = Date.UTC(sy, sm - 1, sd, 12);
  const endMs = Date.UTC(ey, em - 1, ed, 12);
  const days: string[] = [];
  for (let ms = startMs; ms <= endMs; ms += 24 * 60 * 60 * 1000) {
    days.push(new Date(ms).toISOString().slice(0, 10));
  }
  return days;
}

/** Mon=0 … Sun=6 for a YYYY-MM-DD string (noon-anchored to avoid DST). */
function weekdayMondayZero(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay(); // 0=Sun
  return (jsDay + 6) % 7; // shift so Mon=0, Sun=6
}

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

/**
 * Fetches aggregated insights data for a given date and period.
 * Returns category breakdowns, actual vs ideal comparisons, and coverage stats.
 *
 * @param selectedDate — YYYY-MM-DD string
 * @param period — 'daily' or 'weekly'
 */
export function useInsightsData(
  selectedDate: string,
  period: InsightsPeriod,
): UseInsightsDataResult {
  const timezone = getCurrentTimezone();

  // Use timezone-aware local-midnight boundaries so the range matches the
  // user's local day rather than naive UTC midnight.
  const { startOfRangeUTC, endOfRangeUTC, numDays, daysInRange } = useMemo(() => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
    }).format(new Date()); // YYYY-MM-DD

    if (period === "daily") {
      return {
        startOfRangeUTC: getStartOfDay(selectedDate, timezone).toISOString(),
        endOfRangeUTC: getEndOfDay(selectedDate, timezone).toISOString(),
        numDays: 1,
        daysInRange: enumerateDaysInRange(selectedDate, selectedDate, today),
      };
    }

    if (period === "weekly") {
      // Weekly: Mon–Sun
      const { weekStart, weekEnd } = getWeekRange(selectedDate);
      return {
        startOfRangeUTC: getStartOfDay(weekStart, timezone).toISOString(),
        endOfRangeUTC: getEndOfDay(weekEnd, timezone).toISOString(),
        numDays: countDaysInRange(weekStart, weekEnd, today),
        daysInRange: enumerateDaysInRange(weekStart, weekEnd, today),
      };
    }

    // Monthly: first–last of calendar month
    const { monthStart, monthEnd } = getMonthRange(selectedDate);
    return {
      startOfRangeUTC: getStartOfDay(monthStart, timezone).toISOString(),
      endOfRangeUTC: getEndOfDay(monthEnd, timezone).toISOString(),
      numDays: countDaysInRange(monthStart, monthEnd, today),
      daysInRange: enumerateDaysInRange(monthStart, monthEnd, today),
    };
  }, [selectedDate, period, timezone]);

  // Reactive query: time per category
  const { data: categoryRows, isLoading: categoriesLoading } =
    useQuery<InsightsCategoryRow>(INSIGHTS_CATEGORY_QUERY, [
      endOfRangeUTC,
      startOfRangeUTC,
      endOfRangeUTC,
      startOfRangeUTC,
    ]);

  // Reactive query: ideal allocations
  const { data: allocationRows, isLoading: allocationsLoading } =
    useQuery<IdealAllocationRow>(IDEAL_ALLOCATIONS_QUERY);

  // Combine into CategoryInsight[] and DayCoverage
  const result = useMemo(() => {
    // Build per-category lookup keyed by day_of_week (0-6) with a `null` slot
    // for the "every day" default.
    type Targets = { default: number | null; perDay: (number | null)[] };
    const byCategory = new Map<string, Targets>();
    for (const row of allocationRows) {
      let entry = byCategory.get(row.category_id);
      if (!entry) {
        entry = { default: null, perDay: [null, null, null, null, null, null, null] };
        byCategory.set(row.category_id, entry);
      }
      if (row.day_of_week == null) {
        entry.default = row.target_minutes_per_day;
      } else if (row.day_of_week >= 0 && row.day_of_week <= 6) {
        entry.perDay[row.day_of_week] = row.target_minutes_per_day;
      }
    }

    // Precompute the weekday index of each day in range.
    const weekdays = daysInRange.map(weekdayMondayZero);

    /** Sum target minutes for a category across daysInRange. Returns null when
     *  there is no allocation of any kind for the category. */
    const computeTarget = (categoryId: string): number | null => {
      const entry = byCategory.get(categoryId);
      if (!entry) return null;
      const hasAny =
        entry.default != null || entry.perDay.some((v) => v != null);
      if (!hasAny) return null;
      let total = 0;
      for (const wd of weekdays) {
        const override = entry.perDay[wd];
        const value = override != null ? override : entry.default;
        if (value != null) total += value;
      }
      return total;
    };

    let totalTrackedMinutes = 0;

    const categoryInsights: CategoryInsight[] = categoryRows.map((row) => {
      const actualMinutes = Math.round(row.total_seconds / 60);
      totalTrackedMinutes += actualMinutes;

      const targetMinutes = computeTarget(row.category_id);
      const differenceMinutes =
        targetMinutes != null ? actualMinutes - targetMinutes : null;

      return {
        categoryId: row.category_id,
        categoryName: row.category_name,
        categoryColor: row.category_color,
        actualMinutes,
        targetMinutes,
        differenceMinutes,
      };
    });

    const totalMinutes = MINUTES_PER_DAY * numDays;
    const coveragePercent =
      totalMinutes > 0
        ? Math.min(100, Math.round((totalTrackedMinutes / totalMinutes) * 100))
        : 0;

    const coverage: DayCoverage = {
      date: selectedDate,
      trackedMinutes: totalTrackedMinutes,
      coveragePercent,
    };

    return { categoryInsights, coverage, totalTrackedMinutes };
  }, [categoryRows, allocationRows, daysInRange, numDays, selectedDate]);

  return {
    categoryInsights: result.categoryInsights,
    coverage: result.coverage,
    totalTrackedMinutes: result.totalTrackedMinutes,
    isLoading: categoriesLoading || allocationsLoading,
  };
}
