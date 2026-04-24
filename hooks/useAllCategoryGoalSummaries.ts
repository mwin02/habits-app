import { useMemo } from "react";
import { useQuery } from "@powersync/react";

import {
  IDEAL_ALLOCATIONS_QUERY,
  type IdealAllocationRow,
} from "@/db/queries";
import { formatDuration } from "@/lib/timezone";

export interface CategoryGoalSummary {
  /** Short human-readable label (e.g. "8h daily", "8h weekdays · 2h weekends"). */
  label: string;
  /** True when at least one allocation row exists for the category. */
  hasGoal: boolean;
}

export interface UseAllCategoryGoalSummariesResult {
  summariesByCategory: Map<string, CategoryGoalSummary>;
  isLoading: boolean;
}

const NOT_SET: CategoryGoalSummary = { label: "Not set", hasGoal: false };

/**
 * Summarise the ideal-allocations configuration for every category in a
 * form suitable for a list row. Detects common patterns (every day the
 * same, weekdays-vs-weekends) and falls back to "Custom" otherwise.
 */
export function useAllCategoryGoalSummaries(): UseAllCategoryGoalSummariesResult {
  const { data: rows, isLoading } = useQuery<IdealAllocationRow>(
    IDEAL_ALLOCATIONS_QUERY,
  );

  const summariesByCategory = useMemo(() => {
    // Collect rows per category.
    type Entry = {
      defaultVal: number | null;
      perDay: (number | null)[];
    };
    const byCategory = new Map<string, Entry>();
    for (const row of rows) {
      let entry = byCategory.get(row.category_id);
      if (!entry) {
        entry = {
          defaultVal: null,
          perDay: [null, null, null, null, null, null, null],
        };
        byCategory.set(row.category_id, entry);
      }
      if (row.day_of_week == null) {
        entry.defaultVal = row.target_minutes_per_day;
      } else if (row.day_of_week >= 0 && row.day_of_week <= 6) {
        entry.perDay[row.day_of_week] = row.target_minutes_per_day;
      }
    }

    const result = new Map<string, CategoryGoalSummary>();
    for (const [categoryId, entry] of byCategory) {
      result.set(categoryId, summarise(entry.defaultVal, entry.perDay));
    }
    return result;
  }, [rows]);

  return { summariesByCategory, isLoading };
}

// ──────────────────────────────────────────────

function summarise(
  defaultVal: number | null,
  perDay: (number | null)[],
): CategoryGoalSummary {
  // Effective minutes for each weekday (0=Mon … 6=Sun), or null if unset.
  const effective = perDay.map((v) => (v != null ? v : defaultVal));
  const anySet =
    defaultVal != null || perDay.some((v) => v != null);
  if (!anySet) return NOT_SET;

  const allDefined = effective.every((v) => v != null);

  if (allDefined) {
    const first = effective[0]!;
    const allSame = effective.every((v) => v === first);
    if (allSame) {
      return {
        hasGoal: true,
        label: first === 0 ? "Off daily" : `${fmt(first)} daily`,
      };
    }

    const weekdayVals = effective.slice(0, 5) as number[];
    const weekendVals = effective.slice(5, 7) as number[];
    const weekdaysSame = weekdayVals.every((v) => v === weekdayVals[0]);
    const weekendsSame = weekendVals.every((v) => v === weekendVals[0]);
    if (weekdaysSame && weekendsSame) {
      const wd = weekdayVals[0];
      const we = weekendVals[0];
      if (wd > 0 && we === 0) return { hasGoal: true, label: `${fmt(wd)} weekdays` };
      if (wd === 0 && we > 0) return { hasGoal: true, label: `${fmt(we)} weekends` };
      return {
        hasGoal: true,
        label: `${fmt(wd)} weekdays · ${fmt(we)} weekends`,
      };
    }
  }

  return { hasGoal: true, label: "Custom schedule" };
}

function fmt(minutes: number): string {
  if (minutes === 0) return "0h";
  return formatDuration(minutes * 60);
}
