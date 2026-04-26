import type {
  CategoryInsight,
  DayCoverage,
  GoalDirection,
  GoalPeriodKind,
} from "@/db/models";
import {
  IDEAL_ALLOCATIONS_QUERY,
  INSIGHTS_CATEGORY_QUERY,
  type IdealAllocationRow,
  type InsightsCategoryRow,
} from "@/db/queries";
import { getCurrentTimezone, getEndOfDay, getStartOfDay } from "@/lib/timezone";
import { useQuery } from "@powersync/react";
import { useMemo } from "react";
import { useUserPreferences } from "./useUserPreferences";

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

/**
 * Get the first and last day of the week containing the given date.
 * `weekStartDay` follows the user-pref convention 0=Mon … 6=Sun.
 * Returns YYYY-MM-DD strings.
 */
export function getWeekRange(
  dateStr: string,
  weekStartDay: number = 0,
): {
  weekStart: string;
  weekEnd: string;
} {
  const date = new Date(`${dateStr}T12:00:00.000Z`); // noon to avoid DST issues
  const jsDay = date.getUTCDay(); // 0=Sun … 6=Sat
  const monZeroDay = (jsDay + 6) % 7; // 0=Mon … 6=Sun
  const diffToStart = ((monZeroDay - weekStartDay) + 7) % 7;
  const start = new Date(date);
  start.setUTCDate(date.getUTCDate() - diffToStart);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  const fmt = (d: Date): string => d.toISOString().slice(0, 10);
  return { weekStart: fmt(start), weekEnd: fmt(end) };
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
  const { preferences } = useUserPreferences();
  const weekStartDay = preferences.weekStartDay;

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
      // Weekly: 7 days starting from user's preferred week-start day
      const { weekStart, weekEnd } = getWeekRange(selectedDate, weekStartDay);
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
  }, [selectedDate, period, timezone, weekStartDay]);

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
    // Build per-category lookup. Daily rows fill `default` + `perDay`;
    // weekly/monthly rows are singletons (one target across the period).
    // The editor enforces a single kind per category, but at read time we
    // tolerate mixed rows by routing each row to its own kind.
    type Targets = {
      default: number | null;
      perDay: (number | null)[];
      weekly: number | null;
      monthly: number | null;
      directions: GoalDirection[]; // all non-null directions seen for the category
      kinds: Set<GoalPeriodKind>;
    };
    const byCategory = new Map<string, Targets>();
    for (const row of allocationRows) {
      let entry = byCategory.get(row.category_id);
      if (!entry) {
        entry = {
          default: null,
          perDay: [null, null, null, null, null, null, null],
          weekly: null,
          monthly: null,
          directions: [],
          kinds: new Set(),
        };
        byCategory.set(row.category_id, entry);
      }
      const kind: GoalPeriodKind = row.period_kind ?? "daily";
      entry.kinds.add(kind);
      if (kind === "weekly") {
        entry.weekly = row.target_minutes_per_day;
      } else if (kind === "monthly") {
        entry.monthly = row.target_minutes_per_day;
      } else {
        if (row.day_of_week == null) {
          entry.default = row.target_minutes_per_day;
        } else if (row.day_of_week >= 0 && row.day_of_week <= 6) {
          entry.perDay[row.day_of_week] = row.target_minutes_per_day;
        }
      }
      if (row.goal_direction != null) {
        entry.directions.push(row.goal_direction);
      }
    }

    // Precompute the weekday index of each day in range.
    const weekdays = daysInRange.map(weekdayMondayZero);

    /** A category's effective goal kind: weekly/monthly take precedence over
     *  daily so that opting into a period goal isn't masked by a stale daily
     *  row. */
    const resolveKind = (entry: Targets): GoalPeriodKind | null => {
      if (entry.kinds.has("weekly") && entry.weekly != null) return "weekly";
      if (entry.kinds.has("monthly") && entry.monthly != null) return "monthly";
      const hasDaily =
        entry.default != null || entry.perDay.some((v) => v != null);
      return hasDaily ? "daily" : null;
    };

    /** Compute target minutes for a category given its goal kind and the
     *  current view period. Returns null when the goal cadence doesn't line
     *  up with the view (e.g. weekly goal viewed daily) — that prevents
     *  bogus "missed today" signals on legitimate off-days. */
    const computeTarget = (
      categoryId: string,
    ): { target: number | null; kind: GoalPeriodKind | null } => {
      const entry = byCategory.get(categoryId);
      if (!entry) return { target: null, kind: null };
      const kind = resolveKind(entry);
      if (kind == null) return { target: null, kind: null };

      if (kind === "daily") {
        let total = 0;
        for (const wd of weekdays) {
          const override = entry.perDay[wd];
          const value = override != null ? override : entry.default;
          if (value != null) total += value;
        }
        return { target: total, kind };
      }

      // Weekly/monthly goals only render a target when the view period
      // matches the goal cadence. Otherwise return null target but still
      // surface the kind so callers know the goal exists.
      if (kind === "weekly" && period === "weekly") {
        return { target: entry.weekly, kind };
      }
      if (kind === "monthly" && period === "monthly") {
        return { target: entry.monthly, kind };
      }
      return { target: null, kind };
    };

    /** Pick a single direction for the category. The editor keeps all rows
     *  in sync, so in practice the set is {0,1}. Fall back to 'around'. */
    const resolveDirection = (categoryId: string): GoalDirection | null => {
      const entry = byCategory.get(categoryId);
      if (!entry || entry.directions.length === 0) return null;
      const first = entry.directions[0];
      const allSame = entry.directions.every((d) => d === first);
      return allSame ? first : "around";
    };

    let totalTrackedMinutes = 0;

    const categoryInsights: CategoryInsight[] = categoryRows.map((row) => {
      const actualMinutes = Math.round(row.total_seconds / 60);
      totalTrackedMinutes += actualMinutes;

      const { target: targetMinutes, kind: goalPeriodKind } = computeTarget(
        row.category_id,
      );
      const differenceMinutes =
        targetMinutes != null ? actualMinutes - targetMinutes : null;
      const goalDirection =
        targetMinutes != null
          ? resolveDirection(row.category_id) ?? "around"
          : null;

      return {
        categoryId: row.category_id,
        categoryName: row.category_name,
        categoryColor: row.category_color,
        actualMinutes,
        targetMinutes,
        differenceMinutes,
        goalDirection,
        goalPeriodKind,
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
  }, [categoryRows, allocationRows, daysInRange, numDays, selectedDate, period]);

  return {
    categoryInsights: result.categoryInsights,
    coverage: result.coverage,
    totalTrackedMinutes: result.totalTrackedMinutes,
    isLoading: categoriesLoading || allocationsLoading,
  };
}
