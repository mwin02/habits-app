import { useQuery } from "@powersync/react";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import {
  IDLE_REMINDER_DELAY_SECONDS,
  NOTIFICATION_PREFERENCES_QUERY,
  deferForQuietHours,
  resolveLongRunningThreshold,
  updateNotificationPreferences,
} from "@/db/queries";
import type { NotificationPreferencesRecord } from "@/db/schema";
import {
  cancelIdleReminder,
  cancelLongRunningReminder,
  configureNotificationHandler,
  getScheduledIds,
  hasNotificationPermission,
  requestPermissionsIfNeeded,
  scheduleIdleReminder,
  scheduleLongRunningReminder,
} from "@/lib/notifications";

const RUNNING_ENTRY_FOR_SCHEDULER_QUERY = `
  SELECT
    te.id          AS entry_id,
    te.activity_id AS activity_id,
    te.started_at  AS started_at,
    a.name         AS activity_name
  FROM time_entries te
  JOIN activities a ON a.id = te.activity_id
  WHERE te.ended_at IS NULL
    AND te.deleted_at IS NULL
  ORDER BY te.started_at DESC
  LIMIT 1
`;

interface RunningRow {
  entry_id: string;
  activity_id: string;
  started_at: string;
  activity_name: string;
}

const LONG_RUNNING_PREFIX = "long-running-";
const IDLE_REMINDER_ID = "idle-reminder";

configureNotificationHandler();

/**
 * Declarative scheduler for local notifications. Mount once at the root,
 * inside the PowerSync provider.
 *
 * Drives two reminders off of:
 *   - the running-entry PowerSync query (reacts to start/stop/switch)
 *   - the singleton notification_preferences row (global toggles)
 *   - AppState foreground transitions (orphan cleanup + permission recheck)
 *
 * No UI. No imperative hooks into useTimer — reconciliation is driven by
 * state changes so every code path that mutates time_entries is covered.
 */
export function useNotificationScheduler(): void {
  const { data: runningData } = useQuery<RunningRow>(
    RUNNING_ENTRY_FOR_SCHEDULER_QUERY,
  );
  const { data: prefsData } = useQuery<NotificationPreferencesRecord>(
    NOTIFICATION_PREFERENCES_QUERY,
  );

  const running = runningData.length > 0 ? runningData[0] : null;
  const prefs = prefsData.length > 0 ? prefsData[0] : null;

  const idleEnabled = prefs?.idle_reminder_enabled === 1;
  const longRunningEnabled = prefs?.long_running_enabled === 1;
  const thresholdOverride = prefs?.threshold_override_seconds ?? null;
  const quietHoursEnabled = prefs?.quiet_hours_enabled === 1;
  const quietHoursStart = prefs?.quiet_hours_start ?? null;
  const quietHoursEnd = prefs?.quiet_hours_end ?? null;

  const prevEntryIdRef = useRef<string | null | undefined>(undefined);
  const prevIdleEnabledRef = useRef<boolean | undefined>(undefined);
  const prevLongRunningEnabledRef = useRef<boolean | undefined>(undefined);
  const prevQuietHoursKeyRef = useRef<string | undefined>(undefined);
  const permissionAskedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // One-time permission prompt gated on the seeded prefs row.
  useEffect(() => {
    if (!prefs || permissionAskedRef.current) return;
    if (prefs.has_asked_permission === 1) {
      permissionAskedRef.current = true;
      return;
    }
    permissionAskedRef.current = true;
    void (async () => {
      try {
        await requestPermissionsIfNeeded(false);
      } finally {
        await updateNotificationPreferences({ has_asked_permission: 1 });
      }
    })();
  }, [prefs]);

  // Core reconciliation: react to running-entry transitions.
  useEffect(() => {
    if (!prefs) return;

    const prev = prevEntryIdRef.current;
    const currId = running?.entry_id ?? null;

    void (async () => {
      const granted = await hasNotificationPermission();
      if (!granted) {
        prevEntryIdRef.current = currId;
        return;
      }

      // First observation after mount: only ensure long-running is in place.
      if (prev === undefined) {
        if (running !== null && longRunningEnabled) {
          await scheduleLongRunningForEntry(running, prefs);
        }
        prevEntryIdRef.current = currId;
        return;
      }

      if (prev === null && currId !== null && running !== null) {
        await cancelIdleReminder();
        if (longRunningEnabled) {
          await scheduleLongRunningForEntry(running, prefs);
        }
      } else if (prev !== null && currId === null) {
        await cancelLongRunningReminder(prev);
        if (idleEnabled) {
          await scheduleIdleAt(prefs);
        }
      } else if (
        prev !== null &&
        currId !== null &&
        prev !== currId &&
        running !== null
      ) {
        await cancelLongRunningReminder(prev);
        if (longRunningEnabled) {
          await scheduleLongRunningForEntry(running, prefs);
        }
      }

      prevEntryIdRef.current = currId;
    })();
  }, [
    prefs,
    running?.entry_id,
    running?.started_at,
    running?.activity_name,
    running?.activity_id,
    idleEnabled,
    longRunningEnabled,
    thresholdOverride,
    running,
  ]);

  // React to toggle flips that don't coincide with a running-entry transition.
  // e.g. flipping "Still there?" on while stopped should start the 30-min idle
  // timer immediately; flipping it off should cancel any pending reminder.
  useEffect(() => {
    if (!prefs) return;
    const prevIdle = prevIdleEnabledRef.current;
    const prevLongRunning = prevLongRunningEnabledRef.current;
    prevIdleEnabledRef.current = idleEnabled;
    prevLongRunningEnabledRef.current = longRunningEnabled;
    if (prevIdle === undefined || prevLongRunning === undefined) return;

    const idleChanged = prevIdle !== idleEnabled;
    const longRunningChanged = prevLongRunning !== longRunningEnabled;
    if (!idleChanged && !longRunningChanged) return;

    void (async () => {
      const granted = await hasNotificationPermission();
      if (!granted) return;

      if (idleChanged) {
        if (idleEnabled && running === null) {
          await scheduleIdleAt(prefs);
        } else if (!idleEnabled) {
          await cancelIdleReminder();
        }
      }

      if (longRunningChanged && running !== null) {
        if (longRunningEnabled) {
          await scheduleLongRunningForEntry(running, prefs);
        } else {
          await cancelLongRunningReminder(running.entry_id);
        }
      }
    })();
  }, [idleEnabled, longRunningEnabled, prefs, running]);

  // Re-reconcile when quiet-hours fields change so an active schedule shifts
  // to (or away from) the deferred fire time without waiting for the next
  // entry transition or app foreground.
  useEffect(() => {
    if (!prefs) return;
    const key = `${quietHoursEnabled ? 1 : 0}|${quietHoursStart ?? ""}|${quietHoursEnd ?? ""}`;
    const prev = prevQuietHoursKeyRef.current;
    prevQuietHoursKeyRef.current = key;
    if (prev === undefined || prev === key) return;

    void (async () => {
      const granted = await hasNotificationPermission();
      if (!granted) return;
      if (running !== null && longRunningEnabled) {
        await scheduleLongRunningForEntry(running, prefs);
      }
      if (running === null && idleEnabled) {
        // Only reschedule the idle reminder if one is already pending —
        // otherwise we'd be inventing a brand-new reminder out of a config
        // change, which is the wrong UX.
        const ids = await getScheduledIds();
        if (ids.includes(IDLE_REMINDER_ID)) {
          await scheduleIdleAt(prefs);
        }
      }
    })();
  }, [
    prefs,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
    idleEnabled,
    longRunningEnabled,
    running,
  ]);

  // Foreground reconciliation: drop orphaned schedules and recheck permission.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasBackgrounded = appStateRef.current.match(/inactive|background/);
      appStateRef.current = nextState;
      if (!wasBackgrounded || nextState !== "active") return;

      void (async () => {
        const granted = await hasNotificationPermission();
        if (!granted) return;
        const currId = running?.entry_id ?? null;
        const ids = await getScheduledIds();
        for (const id of ids) {
          if (id === IDLE_REMINDER_ID && currId !== null) {
            await cancelIdleReminder();
          } else if (id.startsWith(LONG_RUNNING_PREFIX)) {
            const entryId = id.slice(LONG_RUNNING_PREFIX.length);
            if (entryId !== currId) {
              await cancelLongRunningReminder(entryId);
            }
          }
        }
      })();
    });

    return () => {
      subscription.remove();
    };
  }, [running?.entry_id]);
}

async function scheduleLongRunningForEntry(
  row: RunningRow,
  prefs: NotificationPreferencesRecord | null,
): Promise<void> {
  const threshold = await resolveLongRunningThreshold(row.activity_id);
  const startedAt = new Date(row.started_at).getTime();
  const rawFireAt = new Date(startedAt + threshold * 1000);
  const fireAt = deferForQuietHours(rawFireAt, prefs);
  // firesAfterSeconds drives the body copy ("Xh Ym so far") — keep it tied to
  // the threshold rather than the deferred wall-clock time so it stays
  // truthful about elapsed work, not elapsed wait.
  await scheduleLongRunningReminder({
    entryId: row.entry_id,
    activityName: row.activity_name,
    fireAt,
    firesAfterSeconds: threshold,
  });
}

function scheduleIdleAt(prefs: NotificationPreferencesRecord | null): Promise<void> {
  const rawFireAt = new Date(Date.now() + IDLE_REMINDER_DELAY_SECONDS * 1000);
  return scheduleIdleReminder(deferForQuietHours(rawFireAt, prefs));
}
