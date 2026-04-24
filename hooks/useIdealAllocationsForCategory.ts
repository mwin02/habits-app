import { useMemo } from "react";
import { useQuery } from "@powersync/react";

import type { GoalDirection } from "@/db/models";
import type { IdealAllocationRow } from "@/db/queries";

/**
 * Reactive query for every ideal-allocation row belonging to a single
 * category (non-deleted). Returns the rows already split into the "every
 * day" default and a Mon→Sun array of per-day overrides, which is the shape
 * the editor needs.
 */
export interface UseIdealAllocationsForCategoryResult {
  /** Minutes for `day_of_week IS NULL`, or null when that row isn't set. */
  defaultMinutes: number | null;
  /** Mon=0 … Sun=6. `null` where no override exists for that weekday. */
  perDayMinutes: (number | null)[];
  /** Shared direction across the category's rows. `null` when no goal exists. */
  goalDirection: GoalDirection | null;
  isLoading: boolean;
}

const QUERY = `
  SELECT id, category_id, day_of_week, target_minutes_per_day, goal_direction
  FROM ideal_allocations
  WHERE category_id = ? AND deleted_at IS NULL
`;

export function useIdealAllocationsForCategory(
  categoryId: string | null,
): UseIdealAllocationsForCategoryResult {
  const { data: rows, isLoading } = useQuery<IdealAllocationRow>(
    QUERY,
    categoryId ? [categoryId] : [""],
  );

  return useMemo(() => {
    let defaultMinutes: number | null = null;
    const perDayMinutes: (number | null)[] = [
      null, null, null, null, null, null, null,
    ];
    const directions: GoalDirection[] = [];
    if (categoryId) {
      for (const row of rows) {
        if (row.day_of_week == null) {
          defaultMinutes = row.target_minutes_per_day;
        } else if (row.day_of_week >= 0 && row.day_of_week <= 6) {
          perDayMinutes[row.day_of_week] = row.target_minutes_per_day;
        }
        if (row.goal_direction != null) directions.push(row.goal_direction);
      }
    }
    let goalDirection: GoalDirection | null = null;
    if (directions.length > 0) {
      const first = directions[0];
      goalDirection = directions.every((d) => d === first) ? first : "around";
    }
    return { defaultMinutes, perDayMinutes, goalDirection, isLoading };
  }, [categoryId, rows, isLoading]);
}
