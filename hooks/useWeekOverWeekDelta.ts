import {
  INSIGHTS_CATEGORY_QUERY,
  type InsightsCategoryRow,
} from "@/db/queries";
import { getCurrentTimezone, getEndOfDay, getStartOfDay } from "@/lib/timezone";
import { useQuery } from "@powersync/react";
import { useMemo } from "react";
import { getWeekRange } from "./useInsightsData";

export interface WeekOverWeekRow {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  thisWeekSeconds: number;
  lastWeekSeconds: number;
  /** thisWeek - lastWeek (seconds). Positive = increase. */
  deltaSeconds: number;
}

export interface UseWeekOverWeekDeltaResult {
  rows: WeekOverWeekRow[];
  isLoading: boolean;
}

/** Shift a YYYY-MM-DD date string by N days (noon-anchored to avoid DST). */
function shiftDate(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d, 12) + deltaDays * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Aggregates category totals for the given week and the previous week,
 * joining on category to compute deltas. Uses the SQL clipping pattern
 * from INSIGHTS_CATEGORY_QUERY so midnight-spanning entries are split
 * correctly at range boundaries.
 */
export function useWeekOverWeekDelta(
  weekDate: string,
): UseWeekOverWeekDeltaResult {
  const timezone = getCurrentTimezone();

  const ranges = useMemo(() => {
    const { weekStart, weekEnd } = getWeekRange(weekDate);
    const prevWeekAnchor = shiftDate(weekStart, -1);
    const { weekStart: prevStart, weekEnd: prevEnd } =
      getWeekRange(prevWeekAnchor);

    return {
      thisStart: getStartOfDay(weekStart, timezone).toISOString(),
      thisEnd: getEndOfDay(weekEnd, timezone).toISOString(),
      prevStart: getStartOfDay(prevStart, timezone).toISOString(),
      prevEnd: getEndOfDay(prevEnd, timezone).toISOString(),
    };
  }, [weekDate, timezone]);

  const { data: thisRows, isLoading: thisLoading } =
    useQuery<InsightsCategoryRow>(INSIGHTS_CATEGORY_QUERY, [
      ranges.thisEnd,
      ranges.thisStart,
      ranges.thisEnd,
      ranges.thisStart,
    ]);

  const { data: lastRows, isLoading: lastLoading } =
    useQuery<InsightsCategoryRow>(INSIGHTS_CATEGORY_QUERY, [
      ranges.prevEnd,
      ranges.prevStart,
      ranges.prevEnd,
      ranges.prevStart,
    ]);

  const rows = useMemo<WeekOverWeekRow[]>(() => {
    const byId = new Map<
      string,
      {
        name: string;
        color: string;
        thisSeconds: number;
        lastSeconds: number;
      }
    >();

    for (const row of thisRows) {
      byId.set(row.category_id, {
        name: row.category_name,
        color: row.category_color,
        thisSeconds: row.total_seconds,
        lastSeconds: 0,
      });
    }

    for (const row of lastRows) {
      const existing = byId.get(row.category_id);
      if (existing) {
        existing.lastSeconds = row.total_seconds;
      } else {
        byId.set(row.category_id, {
          name: row.category_name,
          color: row.category_color,
          thisSeconds: 0,
          lastSeconds: row.total_seconds,
        });
      }
    }

    const result: WeekOverWeekRow[] = Array.from(byId.entries()).map(
      ([categoryId, v]) => ({
        categoryId,
        categoryName: v.name,
        categoryColor: v.color,
        thisWeekSeconds: v.thisSeconds,
        lastWeekSeconds: v.lastSeconds,
        deltaSeconds: v.thisSeconds - v.lastSeconds,
      }),
    );

    // Sort by this-week time desc; categories only in last week sink below.
    result.sort((a, b) => b.thisWeekSeconds - a.thisWeekSeconds);
    return result;
  }, [thisRows, lastRows]);

  return { rows, isLoading: thisLoading || lastLoading };
}
