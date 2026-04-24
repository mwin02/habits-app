import { TOP_ACTIVITIES_QUERY, type TopActivityRow } from "@/db/queries";
import { getCurrentTimezone, getEndOfDay, getStartOfDay } from "@/lib/timezone";
import { useQuery } from "@powersync/react";
import { useMemo } from "react";
import { getMonthRange } from "./useInsightsData";

export interface TopActivity {
  activityId: string;
  activityName: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalSeconds: number;
}

export interface UseTopActivitiesResult {
  activities: TopActivity[];
  /** Seconds for the #1 activity — use to normalize bar widths. */
  topSeconds: number;
  isLoading: boolean;
}

const DEFAULT_LIMIT = 10;

/**
 * Returns the top activities by tracked seconds across all categories in the
 * calendar month containing `monthDate`.
 */
export function useTopActivities(
  monthDate: string,
  limit: number = DEFAULT_LIMIT,
): UseTopActivitiesResult {
  const timezone = getCurrentTimezone();

  const { startIso, endIso } = useMemo(() => {
    const { monthStart, monthEnd } = getMonthRange(monthDate);
    return {
      startIso: getStartOfDay(monthStart, timezone).toISOString(),
      endIso: getEndOfDay(monthEnd, timezone).toISOString(),
    };
  }, [monthDate, timezone]);

  const { data: rows, isLoading } = useQuery<TopActivityRow>(
    TOP_ACTIVITIES_QUERY,
    [endIso, startIso, endIso, startIso],
  );

  const result = useMemo(() => {
    const sliced = rows.slice(0, limit).map<TopActivity>((row) => ({
      activityId: row.activity_id,
      activityName: row.activity_name,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryColor: row.category_color,
      totalSeconds: row.total_seconds,
    }));
    const topSeconds = sliced[0]?.totalSeconds ?? 0;
    return { activities: sliced, topSeconds };
  }, [rows, limit]);

  return { ...result, isLoading };
}
