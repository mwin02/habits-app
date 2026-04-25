import { db } from "@/lib/powersync";
import {
  getCurrentTimezone,
  getDateInTimezone,
  parseLocalTimeOfDay,
} from "@/lib/timezone";
import type { NotificationPreferencesRecord } from "../schema";
import { nowUTC } from "./_helpers";

/** Minimum long-running threshold in seconds (45 minutes). */
export const LONG_RUNNING_MIN_THRESHOLD_SECONDS = 45 * 60;

/** Idle reminder delay in seconds (30 minutes). */
export const IDLE_REMINDER_DELAY_SECONDS = 30 * 60;

/**
 * SQL query for the singleton notification preferences row.
 * Use with useQuery for reactive reads.
 */
export const NOTIFICATION_PREFERENCES_QUERY = `
  SELECT id, user_id, idle_reminder_enabled, long_running_enabled,
         threshold_override_seconds, has_asked_permission,
         quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
         created_at, updated_at, deleted_at
  FROM notification_preferences
  WHERE deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1
`;

/** Fetch the singleton notification preferences row (one-shot). */
export async function getNotificationPreferences(): Promise<NotificationPreferencesRecord | null> {
  return db.getOptional<NotificationPreferencesRecord>(
    NOTIFICATION_PREFERENCES_QUERY,
  );
}

export interface NotificationPreferencesPatch {
  idle_reminder_enabled?: number;
  long_running_enabled?: number;
  threshold_override_seconds?: number | null;
  has_asked_permission?: number;
  quiet_hours_enabled?: number;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
}

/** Partial update of the singleton preferences row. */
export async function updateNotificationPreferences(
  patch: NotificationPreferencesPatch,
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (patch.idle_reminder_enabled !== undefined) {
    fields.push("idle_reminder_enabled = ?");
    values.push(patch.idle_reminder_enabled);
  }
  if (patch.long_running_enabled !== undefined) {
    fields.push("long_running_enabled = ?");
    values.push(patch.long_running_enabled);
  }
  if (patch.threshold_override_seconds !== undefined) {
    fields.push("threshold_override_seconds = ?");
    values.push(patch.threshold_override_seconds);
  }
  if (patch.has_asked_permission !== undefined) {
    fields.push("has_asked_permission = ?");
    values.push(patch.has_asked_permission);
  }
  if (patch.quiet_hours_enabled !== undefined) {
    fields.push("quiet_hours_enabled = ?");
    values.push(patch.quiet_hours_enabled);
  }
  if (patch.quiet_hours_start !== undefined) {
    fields.push("quiet_hours_start = ?");
    values.push(patch.quiet_hours_start);
  }
  if (patch.quiet_hours_end !== undefined) {
    fields.push("quiet_hours_end = ?");
    values.push(patch.quiet_hours_end);
  }

  if (fields.length === 0) return;

  const now = nowUTC();
  fields.push("updated_at = ?");
  values.push(now);

  await db.execute(
    `UPDATE notification_preferences
     SET ${fields.join(", ")}
     WHERE deleted_at IS NULL`,
    values,
  );
}

/**
 * Defer a notification's fire time out of the user's configured quiet-hours
 * window. Returns the original Date if quiet hours are disabled, the prefs
 * are missing, or `fireAt` is outside any window. Otherwise returns the
 * end-of-window Date the reminder should fire at instead.
 *
 * Wraps midnight when `end <= start` (e.g. 22:00 → 07:00).
 */
export function deferForQuietHours(
  fireAt: Date,
  prefs: NotificationPreferencesRecord | null,
): Date {
  if (!prefs || prefs.quiet_hours_enabled !== 1) return fireAt;
  const start = prefs.quiet_hours_start;
  const end = prefs.quiet_hours_end;
  if (!start || !end || start === end) return fireAt;

  const tz = getCurrentTimezone();
  const fireDateStr = getDateInTimezone(fireAt, tz);
  const startToday = parseLocalTimeOfDay(start, fireDateStr, tz);
  const endToday = parseLocalTimeOfDay(end, fireDateStr, tz);
  const wraps = endToday.getTime() <= startToday.getTime();

  if (!wraps) {
    if (fireAt >= startToday && fireAt < endToday) return endToday;
    return fireAt;
  }

  // Window wraps midnight. Two windows are relevant: the one that began
  // yesterday (ending today's `end`) and the one that begins today's `start`
  // (ending tomorrow's `end`).
  const fireMs = fireAt.getTime();
  if (fireMs < endToday.getTime()) {
    const startYesterday = parseLocalTimeOfDay(
      start,
      shiftDateStr(fireDateStr, -1),
      tz,
    );
    if (fireMs >= startYesterday.getTime()) return endToday;
    return fireAt;
  }
  if (fireMs >= startToday.getTime()) {
    return parseLocalTimeOfDay(end, shiftDateStr(fireDateStr, 1), tz);
  }
  return fireAt;
}

function shiftDateStr(dateStr: string, deltaDays: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns rows of duration_seconds for the given activity's completed entries
 * in the last 30 days, excluding retroactive/import sources and clipping to
 * [60s, 43200s] to drop accidental taps and forgotten-timer outliers.
 */
export const MEDIAN_DURATION_QUERY = `
  SELECT duration_seconds
  FROM time_entries
  WHERE activity_id = ?
    AND deleted_at IS NULL
    AND ended_at IS NOT NULL
    AND started_at >= ?
    AND source IN ('timer','manual')
    AND duration_seconds BETWEEN 60 AND 43200
  ORDER BY duration_seconds
`;

/** Minimum samples required to trust the per-activity median. */
export const LONG_RUNNING_MIN_SAMPLES = 3;

function median(sortedValues: number[]): number {
  const n = sortedValues.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sortedValues[mid];
  return (sortedValues[mid - 1] + sortedValues[mid]) / 2;
}

/**
 * Compute the long-running reminder threshold (seconds) for an activity.
 * threshold = max(1.5 * median(recent durations), 45 min).
 * Falls back to the 45 min floor when the activity has fewer than
 * LONG_RUNNING_MIN_SAMPLES completed entries in the last 30 days — a single
 * noisy sample can set an unreasonable threshold for activities that
 * usually run much longer.
 */
export async function computeActivityThreshold(
  activityId: string,
): Promise<number> {
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const rows = await db.getAll<{ duration_seconds: number }>(
    MEDIAN_DURATION_QUERY,
    [activityId, thirtyDaysAgo],
  );
  if (rows.length < LONG_RUNNING_MIN_SAMPLES)
    return LONG_RUNNING_MIN_THRESHOLD_SECONDS;
  const sorted = rows.map((r) => r.duration_seconds);
  const m = median(sorted);
  return Math.max(Math.round(1.5 * m), LONG_RUNNING_MIN_THRESHOLD_SECONDS);
}

/**
 * Unified long-running threshold used by both the notification scheduler
 * and the in-app forgotten-timer modal. Honours `threshold_override_seconds`
 * if set; otherwise falls back to the per-activity median computation.
 */
export async function resolveLongRunningThreshold(
  activityId: string,
): Promise<number> {
  const prefs = await getNotificationPreferences();
  const override = prefs?.threshold_override_seconds ?? null;
  if (override !== null && override > 0) return override;
  return computeActivityThreshold(activityId);
}
