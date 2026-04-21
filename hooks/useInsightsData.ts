import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import {
  INSIGHTS_CATEGORY_QUERY,
  IDEAL_ALLOCATIONS_QUERY,
  type InsightsCategoryRow,
  type IdealAllocationRow,
} from '@/db/queries';
import type { CategoryInsight, DayCoverage } from '@/db/models';
import { getCurrentTimezone, getEndOfDay, getStartOfDay } from '@/lib/timezone';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type InsightsPeriod = 'daily' | 'weekly';

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

/** Waking hours per day in minutes (16h) */
const WAKING_MINUTES_PER_DAY = 960;

/**
 * Get the Monday (start) and Sunday (end) of the week containing the given date.
 * Returns YYYY-MM-DD strings.
 */
function getWeekRange(dateStr: string): { weekStart: string; weekEnd: string } {
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
function countDaysInRange(startDate: string, endDate: string, todayDate: string): number {
  const effectiveEnd = endDate > todayDate ? todayDate : endDate;
  if (effectiveEnd < startDate) return 0;
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${effectiveEnd}T00:00:00.000Z`);
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
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
  const { startOfRangeUTC, endOfRangeUTC, numDays } = useMemo(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone })
      .format(new Date()); // YYYY-MM-DD

    if (period === 'daily') {
      return {
        startOfRangeUTC: getStartOfDay(selectedDate, timezone).toISOString(),
        endOfRangeUTC: getEndOfDay(selectedDate, timezone).toISOString(),
        numDays: 1,
      };
    }

    // Weekly: Mon–Sun
    const { weekStart, weekEnd } = getWeekRange(selectedDate);
    return {
      startOfRangeUTC: getStartOfDay(weekStart, timezone).toISOString(),
      endOfRangeUTC: getEndOfDay(weekEnd, timezone).toISOString(),
      numDays: countDaysInRange(weekStart, weekEnd, today),
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
    // Build allocation lookup: categoryId → target minutes per day
    const allocationMap = new Map<string, number>();
    for (const row of allocationRows) {
      allocationMap.set(row.category_id, row.target_minutes_per_day);
    }

    let totalTrackedMinutes = 0;

    const categoryInsights: CategoryInsight[] = categoryRows.map((row) => {
      const actualMinutes = Math.round(row.total_seconds / 60);
      totalTrackedMinutes += actualMinutes;

      const dailyTarget = allocationMap.get(row.category_id);
      // Scale target to period: daily = 1x, weekly = numDays x
      const targetMinutes = dailyTarget != null ? dailyTarget * numDays : null;
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

    const wakingMinutes = WAKING_MINUTES_PER_DAY * numDays;
    const coveragePercent = wakingMinutes > 0
      ? Math.min(100, Math.round((totalTrackedMinutes / wakingMinutes) * 100))
      : 0;

    const coverage: DayCoverage = {
      date: selectedDate,
      trackedMinutes: totalTrackedMinutes,
      wakingMinutes,
      coveragePercent,
    };

    return { categoryInsights, coverage, totalTrackedMinutes };
  }, [categoryRows, allocationRows, numDays, selectedDate]);

  return {
    categoryInsights: result.categoryInsights,
    coverage: result.coverage,
    totalTrackedMinutes: result.totalTrackedMinutes,
    isLoading: categoriesLoading || allocationsLoading,
  };
}
