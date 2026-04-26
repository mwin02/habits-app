import { useMemo } from "react";
import { useQuery } from "@powersync/react";

import type { GoalDirection, GoalPeriodKind } from "@/db/models";
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
      weekly: number | null;
      monthly: number | null;
      directions: GoalDirection[];
      kinds: Set<GoalPeriodKind>;
    };
    const byCategory = new Map<string, Entry>();
    for (const row of rows) {
      let entry = byCategory.get(row.category_id);
      if (!entry) {
        entry = {
          defaultVal: null,
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
          entry.defaultVal = row.target_minutes_per_day;
        } else if (row.day_of_week >= 0 && row.day_of_week <= 6) {
          entry.perDay[row.day_of_week] = row.target_minutes_per_day;
        }
      }
      if (row.goal_direction != null) entry.directions.push(row.goal_direction);
    }

    const result = new Map<string, CategoryGoalSummary>();
    for (const [categoryId, entry] of byCategory) {
      const direction = resolveDirection(entry.directions);
      // Period kind precedence mirrors useInsightsData.resolveKind.
      if (entry.kinds.has("weekly") && entry.weekly != null) {
        result.set(categoryId, summarisePeriod(entry.weekly, "weekly", direction));
      } else if (entry.kinds.has("monthly") && entry.monthly != null) {
        result.set(categoryId, summarisePeriod(entry.monthly, "monthly", direction));
      } else {
        result.set(
          categoryId,
          summarise(entry.defaultVal, entry.perDay, direction),
        );
      }
    }
    return result;
  }, [rows]);

  return { summariesByCategory, isLoading };
}

// ──────────────────────────────────────────────

function resolveDirection(directions: GoalDirection[]): GoalDirection {
  if (directions.length === 0) return "around";
  const first = directions[0];
  return directions.every((d) => d === first) ? first : "around";
}

function directionPrefix(d: GoalDirection): string {
  if (d === "at_least") return "At least ";
  if (d === "at_most") return "At most ";
  return "";
}

function summarise(
  defaultVal: number | null,
  perDay: (number | null)[],
  direction: GoalDirection,
): CategoryGoalSummary {
  // Effective minutes for each weekday (0=Mon … 6=Sun), or null if unset.
  const effective = perDay.map((v) => (v != null ? v : defaultVal));
  const anySet =
    defaultVal != null || perDay.some((v) => v != null);
  if (!anySet) return NOT_SET;

  const allDefined = effective.every((v) => v != null);
  const prefix = directionPrefix(direction);

  if (allDefined) {
    const first = effective[0]!;
    const allSame = effective.every((v) => v === first);
    if (allSame) {
      return {
        hasGoal: true,
        label:
          first === 0 ? "Off daily" : `${prefix}${fmt(first)} daily`,
      };
    }

    const weekdayVals = effective.slice(0, 5) as number[];
    const weekendVals = effective.slice(5, 7) as number[];
    const weekdaysSame = weekdayVals.every((v) => v === weekdayVals[0]);
    const weekendsSame = weekendVals.every((v) => v === weekendVals[0]);
    if (weekdaysSame && weekendsSame) {
      const wd = weekdayVals[0];
      const we = weekendVals[0];
      if (wd > 0 && we === 0)
        return { hasGoal: true, label: `${prefix}${fmt(wd)} weekdays` };
      if (wd === 0 && we > 0)
        return { hasGoal: true, label: `${prefix}${fmt(we)} weekends` };
      return {
        hasGoal: true,
        label: `${prefix}${fmt(wd)} weekdays · ${fmt(we)} weekends`,
      };
    }
  }

  return { hasGoal: true, label: `${prefix}Custom schedule` };
}

function summarisePeriod(
  minutes: number,
  kind: "weekly" | "monthly",
  direction: GoalDirection,
): CategoryGoalSummary {
  const prefix = directionPrefix(direction);
  const cadence = kind === "weekly" ? "weekly" : "monthly";
  if (minutes === 0) {
    return { hasGoal: true, label: `Off ${cadence}` };
  }
  return { hasGoal: true, label: `${prefix}${fmt(minutes)} ${cadence}` };
}

function fmt(minutes: number): string {
  if (minutes === 0) return "0h";
  return formatDuration(minutes * 60);
}
