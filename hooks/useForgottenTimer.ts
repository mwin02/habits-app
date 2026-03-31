import type { RunningTimer } from "@/db/models";
import { getCurrentTimezone, isToday } from "@/lib/timezone";
import { useQuery } from "@powersync/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

/**
 * SQL query to get the running entry with enriched data (same as useTimer).
 */
const RUNNING_ENTRY_QUERY = `
  SELECT
    te.id          AS entry_id,
    te.activity_id AS activity_id,
    te.started_at  AS started_at,
    te.timezone    AS timezone,
    a.name         AS activity_name,
    c.name         AS category_name,
    c.color        AS category_color
  FROM time_entries te
  JOIN activities a ON a.id = te.activity_id
  JOIN categories c ON c.id = a.category_id
  WHERE te.ended_at IS NULL
    AND te.deleted_at IS NULL
  ORDER BY te.started_at DESC
  LIMIT 1
`;

interface RunningEntryRow {
  entry_id: string;
  activity_id: string;
  started_at: string;
  timezone: string;
  activity_name: string;
  category_name: string;
  category_color: string;
}

/** How many seconds before we consider a timer "forgotten" */
const FORGOTTEN_THRESHOLD_SECONDS = 2 * 60 * 60; // 2 hours

export interface UseForgottenTimerResult {
  /** The stale/forgotten entry if one is detected, otherwise null */
  forgottenEntry: RunningTimer | null;
  /** Dismiss the forgotten timer prompt (user chose to keep it running) */
  dismissForgotten: () => void;
}

/**
 * Detects "forgotten" timers — running entries that are either:
 * - More than 2 hours old, OR
 * - Started on a different calendar day
 *
 * Checks on app foreground (background → active transition) and on mount.
 * UI can use `forgottenEntry` to show a bottom sheet prompting the user.
 */
export function useForgottenTimer(): UseForgottenTimerResult {
  const { data } = useQuery<RunningEntryRow>(RUNNING_ENTRY_QUERY);
  const [dismissed, setDismissed] = useState(false);
  const [shouldCheck, setShouldCheck] = useState(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const row = data.length > 0 ? data[0] : null;

  // Listen for app state changes (background → active)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        // App came to foreground — re-check for forgotten timers
        setShouldCheck(true);
        setDismissed(false);
      }
      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Determine if the current running entry qualifies as "forgotten"
  const forgottenEntry: RunningTimer | null = (() => {
    if (!shouldCheck || dismissed || row === null) return null;

    const startedAt = new Date(row.started_at);
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startedAt.getTime()) / 1000);
    const timezone = getCurrentTimezone();

    const isTooOld = elapsedSeconds > FORGOTTEN_THRESHOLD_SECONDS;
    const isDifferentDay = !isToday(row.started_at, timezone);

    if (!isTooOld && !isDifferentDay) return null;

    return {
      entryId: row.entry_id,
      activityId: row.activity_id,
      activityName: row.activity_name,
      categoryName: row.category_name,
      categoryColor: row.category_color,
      startedAt,
      elapsedSeconds,
      timezone: row.timezone,
    };
  })();

  const dismissForgotten = useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    forgottenEntry,
    dismissForgotten,
  };
}
