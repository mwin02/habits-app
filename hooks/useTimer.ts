import { useCallback, useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { startEntry, stopEntry, switchEntry } from '@/db/queries';
import type { RunningTimer } from '@/db/models';
import { useElapsedTime } from './useElapsedTime';
import { getCurrentTimezone } from '@/lib/timezone';

/**
 * SQL query that fetches the currently running time entry joined with
 * activity and category names/colors. Returns at most 1 row.
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

export interface UseTimerResult {
  /** The currently running timer, or null if nothing is running */
  runningEntry: RunningTimer | null;
  /** True while the initial query is loading */
  isLoading: boolean;
  /** Start tracking a new activity. Throws if a timer is already running. */
  startActivity: (activityId: string) => Promise<void>;
  /** Stop the current timer. No-op if nothing is running. */
  stopActivity: () => Promise<void>;
  /** Stop current timer and immediately start a new one (single transaction). */
  switchActivity: (newActivityId: string) => Promise<void>;
}

/**
 * Core timer hook — provides reactive running-timer state and actions.
 *
 * Usage:
 * ```
 * const { runningEntry, startActivity, stopActivity, switchActivity } = useTimer();
 * ```
 *
 * The running entry auto-updates when the underlying database changes
 * (via PowerSync's useQuery). Elapsed seconds tick every second via useElapsedTime.
 */
export function useTimer(): UseTimerResult {
  const { data, isLoading } = useQuery<RunningEntryRow>(RUNNING_ENTRY_QUERY);

  const row = data.length > 0 ? data[0] : null;

  // Elapsed time ticks every second, recomputed from startedAt (never accumulated)
  const elapsedSeconds = useElapsedTime(row?.started_at ?? null);

  const runningEntry: RunningTimer | null = useMemo(() => {
    if (row === null) return null;
    return {
      entryId: row.entry_id,
      activityId: row.activity_id,
      activityName: row.activity_name,
      categoryName: row.category_name,
      categoryColor: row.category_color,
      startedAt: new Date(row.started_at),
      elapsedSeconds,
      timezone: row.timezone,
    };
  }, [row, elapsedSeconds]);

  const startActivity = useCallback(async (activityId: string): Promise<void> => {
    const timezone = getCurrentTimezone();
    await startEntry({ activityId, timezone });
  }, []);

  const stopActivity = useCallback(async (): Promise<void> => {
    if (row === null) return;
    await stopEntry(row.entry_id);
  }, [row]);

  const switchActivityFn = useCallback(async (newActivityId: string): Promise<void> => {
    if (row === null) {
      // No running timer — just start
      const timezone = getCurrentTimezone();
      await startEntry({ activityId: newActivityId, timezone });
      return;
    }
    const timezone = getCurrentTimezone();
    await switchEntry({
      currentEntryId: row.entry_id,
      newActivityId,
      timezone,
    });
  }, [row]);

  return {
    runningEntry,
    isLoading,
    startActivity,
    stopActivity,
    switchActivity: switchActivityFn,
  };
}
