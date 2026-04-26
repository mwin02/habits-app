import { useMemo } from "react";
import { useQuery } from "@powersync/react";
import {
  DEFAULT_INSIGHTS_PERIOD,
  DEFAULT_WEEK_START_DAY,
  USER_PREFERENCES_QUERY,
  type InsightsPeriod,
  type WeekStartDay,
} from "@/db/queries/user-preferences";

interface FlatRow {
  id: string;
  week_start_day: number | null;
  default_insights_period: string | null;
  default_timezone: string | null;
}

export interface UserPreferences {
  /** 0=Mon … 6=Sun. NULL → 0/Mon. */
  weekStartDay: WeekStartDay;
  defaultInsightsPeriod: InsightsPeriod;
  /** IANA tz string, or null to fall back to device tz. */
  defaultTimezone: string | null;
}

export interface UseUserPreferencesResult {
  preferences: UserPreferences;
  isLoading: boolean;
}

const VALID_PERIODS: ReadonlySet<InsightsPeriod> = new Set([
  "daily",
  "weekly",
  "monthly",
]);

function normalizeWeekStart(value: number | null): WeekStartDay {
  if (value == null || value < 0 || value > 6) return DEFAULT_WEEK_START_DAY;
  return value as WeekStartDay;
}

function normalizePeriod(value: string | null): InsightsPeriod {
  if (value && VALID_PERIODS.has(value as InsightsPeriod)) {
    return value as InsightsPeriod;
  }
  return DEFAULT_INSIGHTS_PERIOD;
}

/**
 * Reactive read of the singleton user_preferences row. Returns defaults
 * when the row is missing or columns are NULL — callers never need to
 * branch on absence.
 */
export function useUserPreferences(): UseUserPreferencesResult {
  const { data, isLoading } = useQuery<FlatRow>(USER_PREFERENCES_QUERY);

  const preferences = useMemo<UserPreferences>(() => {
    const row = data[0];
    return {
      weekStartDay: normalizeWeekStart(row?.week_start_day ?? null),
      defaultInsightsPeriod: normalizePeriod(
        row?.default_insights_period ?? null,
      ),
      defaultTimezone: row?.default_timezone ?? null,
    };
  }, [data]);

  return { preferences, isLoading };
}
