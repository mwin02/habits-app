import { db } from '@/lib/powersync';
import { generateId } from '@/lib/uuid';
import type {
  CategoryRecord,
  ActivityRecord,
  TimeEntryRecord,
  IdealAllocationRecord,
  NotificationPreferencesRecord,
} from './schema';
import type { GoalDirection, TimeEntrySource } from './models';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function nowUTC(): string {
  return new Date().toISOString();
}

function uuidSQL(): string {
  return 'uuid()';
}

// ──────────────────────────────────────────────
// Categories
// ──────────────────────────────────────────────

/** Get all active (non-archived, non-deleted) categories ordered by sort_order */
export async function getCategories(): Promise<CategoryRecord[]> {
  return db.getAll<CategoryRecord>(
    `SELECT * FROM categories
     WHERE is_archived = 0 AND deleted_at IS NULL
     ORDER BY sort_order, name`
  );
}

/** Get a single category by ID */
export async function getCategory(id: string): Promise<CategoryRecord | null> {
  return db.getOptional<CategoryRecord>(
    'SELECT * FROM categories WHERE id = ?',
    [id]
  );
}

/** Create a custom category */
export async function createCategory(params: {
  name: string;
  color: string;
  icon: string | null;
  sortOrder?: number;
}): Promise<string> {
  const id = generateId();
  const now = nowUTC();
  await db.execute(
    `INSERT INTO categories (id, user_id, name, color, icon, is_preset, sort_order, is_archived, created_at, updated_at)
     VALUES (?, NULL, ?, ?, ?, 0, ?, 0, ?, ?)`,
    [id, params.name, params.color, params.icon, params.sortOrder ?? 0, now, now]
  );
  return id;
}

/** Update a category */
export async function updateCategory(
  id: string,
  params: Partial<{ name: string; color: string; icon: string | null; sortOrder: number }>
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (params.name !== undefined) { sets.push('name = ?'); values.push(params.name); }
  if (params.color !== undefined) { sets.push('color = ?'); values.push(params.color); }
  if (params.icon !== undefined) { sets.push('icon = ?'); values.push(params.icon); }
  if (params.sortOrder !== undefined) { sets.push('sort_order = ?'); values.push(params.sortOrder); }

  if (sets.length === 0) return;

  sets.push('updated_at = ?');
  values.push(nowUTC());
  values.push(id);

  await db.execute(
    `UPDATE categories SET ${sets.join(', ')} WHERE id = ?`,
    values
  );
}

/** Soft-delete a category (archive it) */
export async function archiveCategory(id: string): Promise<void> {
  await db.execute(
    'UPDATE categories SET is_archived = 1, updated_at = ? WHERE id = ?',
    [nowUTC(), id]
  );
}

// ──────────────────────────────────────────────
// Activities
// ──────────────────────────────────────────────

/** Get all active activities, optionally filtered by category */
export async function getActivities(categoryId?: string): Promise<ActivityRecord[]> {
  if (categoryId) {
    return db.getAll<ActivityRecord>(
      `SELECT * FROM activities
       WHERE category_id = ? AND is_archived = 0 AND deleted_at IS NULL
       ORDER BY sort_order, name`,
      [categoryId]
    );
  }
  return db.getAll<ActivityRecord>(
    `SELECT * FROM activities
     WHERE is_archived = 0 AND deleted_at IS NULL
     ORDER BY sort_order, name`
  );
}

/** Get a single activity by ID */
export async function getActivity(id: string): Promise<ActivityRecord | null> {
  return db.getOptional<ActivityRecord>(
    'SELECT * FROM activities WHERE id = ?',
    [id]
  );
}

/** Create a custom activity */
export async function createActivity(params: {
  categoryId: string;
  name: string;
  sortOrder?: number;
}): Promise<string> {
  const id = generateId();
  const now = nowUTC();
  await db.execute(
    `INSERT INTO activities (id, user_id, category_id, name, is_preset, sort_order, is_archived, created_at, updated_at)
     VALUES (?, NULL, ?, ?, 0, ?, 0, ?, ?)`,
    [id, params.categoryId, params.name, params.sortOrder ?? 0, now, now]
  );
  return id;
}

/** Update an activity */
export async function updateActivity(
  id: string,
  params: Partial<{ name: string; categoryId: string; sortOrder: number }>
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (params.name !== undefined) { sets.push('name = ?'); values.push(params.name); }
  if (params.categoryId !== undefined) { sets.push('category_id = ?'); values.push(params.categoryId); }
  if (params.sortOrder !== undefined) { sets.push('sort_order = ?'); values.push(params.sortOrder); }

  if (sets.length === 0) return;

  sets.push('updated_at = ?');
  values.push(nowUTC());
  values.push(id);

  await db.execute(
    `UPDATE activities SET ${sets.join(', ')} WHERE id = ?`,
    values
  );
}

/** Soft-delete an activity (archive it) */
export async function archiveActivity(id: string): Promise<void> {
  await db.execute(
    'UPDATE activities SET is_archived = 1, updated_at = ? WHERE id = ?',
    [nowUTC(), id]
  );
}

// ──────────────────────────────────────────────
// Time Entries
// ──────────────────────────────────────────────

/** Get the currently running time entry (if any) */
export async function getRunningEntry(): Promise<TimeEntryRecord | null> {
  return db.getOptional<TimeEntryRecord>(
    `SELECT * FROM time_entries
     WHERE ended_at IS NULL AND deleted_at IS NULL
     ORDER BY started_at DESC
     LIMIT 1`
  );
}

/** Start a new time entry (timer mode) */
export async function startEntry(params: {
  activityId: string;
  timezone: string;
}): Promise<string> {
  const id = generateId();
  const now = nowUTC();
  await db.execute(
    `INSERT INTO time_entries (id, user_id, activity_id, started_at, ended_at, duration_seconds, timezone, note, source, created_at, updated_at)
     VALUES (?, NULL, ?, ?, NULL, NULL, ?, NULL, 'timer', ?, ?)`,
    [id, params.activityId, now, params.timezone, now, now]
  );
  return id;
}

/** Stop a running time entry */
export async function stopEntry(entryId: string): Promise<void> {
  const now = nowUTC();
  // Compute duration from started_at to now
  await db.execute(
    `UPDATE time_entries
     SET ended_at = ?,
         duration_seconds = CAST((julianday(?) - julianday(started_at)) * 86400 AS INTEGER),
         updated_at = ?
     WHERE id = ?`,
    [now, now, now, entryId]
  );
}

/**
 * Quick-switch: stop current entry and start a new one in a single transaction.
 * Returns the new entry ID.
 */
export async function switchEntry(params: {
  currentEntryId: string;
  newActivityId: string;
  timezone: string;
}): Promise<string> {
  const newId = generateId();
  const now = nowUTC();

  await db.writeTransaction(async (tx) => {
    // Stop current entry
    await tx.execute(
      `UPDATE time_entries
       SET ended_at = ?,
           duration_seconds = CAST((julianday(?) - julianday(started_at)) * 86400 AS INTEGER),
           updated_at = ?
       WHERE id = ?`,
      [now, now, now, params.currentEntryId]
    );

    // Start new entry
    await tx.execute(
      `INSERT INTO time_entries (id, user_id, activity_id, started_at, ended_at, duration_seconds, timezone, note, source, created_at, updated_at)
       VALUES (?, NULL, ?, ?, NULL, NULL, ?, NULL, 'timer', ?, ?)`,
      [newId, params.newActivityId, now, params.timezone, now, now]
    );
  });

  return newId;
}

/** End a forgotten entry with a specific end time */
export async function endForgottenEntry(entryId: string, endedAt: Date): Promise<void> {
  const endedAtStr = endedAt.toISOString();
  const now = nowUTC();
  await db.execute(
    `UPDATE time_entries
     SET ended_at = ?,
         duration_seconds = CAST((julianday(?) - julianday(started_at)) * 86400 AS INTEGER),
         updated_at = ?
     WHERE id = ?`,
    [endedAtStr, endedAtStr, now, entryId]
  );
}

/** Create a retroactive (manually filled) time entry */
export async function createRetroactiveEntry(params: {
  activityId: string;
  startedAt: Date;
  endedAt: Date;
  timezone: string;
  note?: string;
}): Promise<string> {
  const id = generateId();
  const now = nowUTC();
  const startStr = params.startedAt.toISOString();
  const endStr = params.endedAt.toISOString();
  const durationSeconds = Math.round(
    (params.endedAt.getTime() - params.startedAt.getTime()) / 1000
  );

  await db.execute(
    `INSERT INTO time_entries (id, user_id, activity_id, started_at, ended_at, duration_seconds, timezone, note, source, created_at, updated_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'retroactive', ?, ?)`,
    [id, params.activityId, startStr, endStr, durationSeconds, params.timezone, params.note ?? null, now, now]
  );
  return id;
}

/** Update a time entry's note */
export async function updateEntryNote(entryId: string, note: string | null): Promise<void> {
  await db.execute(
    'UPDATE time_entries SET note = ?, updated_at = ? WHERE id = ?',
    [note, nowUTC(), entryId]
  );
}

/** Update start/end times of a time entry, recalculating duration */
export async function updateEntryTimes(
  entryId: string,
  startedAt: Date,
  endedAt: Date,
): Promise<void> {
  const startStr = startedAt.toISOString();
  const endStr = endedAt.toISOString();
  const durationSeconds = Math.round(
    (endedAt.getTime() - startedAt.getTime()) / 1000,
  );
  await db.execute(
    'UPDATE time_entries SET started_at = ?, ended_at = ?, duration_seconds = ?, updated_at = ? WHERE id = ?',
    [startStr, endStr, durationSeconds, nowUTC(), entryId],
  );
}

/** Soft-delete a time entry */
export async function deleteEntry(entryId: string): Promise<void> {
  await db.execute(
    'UPDATE time_entries SET deleted_at = ?, updated_at = ? WHERE id = ?',
    [nowUTC(), nowUTC(), entryId]
  );
}

/** Get time entries for a specific day (in local timezone date string 'YYYY-MM-DD') */
export async function getEntriesForDay(date: string): Promise<TimeEntryRecord[]> {
  // Get entries that overlap with the given day
  // An entry overlaps if it started before end-of-day AND ended after start-of-day (or is still running)
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  return db.getAll<TimeEntryRecord>(
    `SELECT * FROM time_entries
     WHERE deleted_at IS NULL
       AND started_at <= ?
       AND (ended_at IS NULL OR ended_at >= ?)
     ORDER BY started_at`,
    [endOfDay, startOfDay]
  );
}

/** Row shape returned by the timeline detail query */
export interface TimelineEntryRow {
  entry_id: string;
  activity_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  timezone: string;
  note: string | null;
  source: string;
  activity_name: string;
  category_name: string;
  category_color: string;
  category_icon: string | null;
}

/**
 * SQL query for timeline entries — joins time_entries with activity and category.
 * Params: [endOfDayUTC, startOfDayUTC]
 */
export const TIMELINE_ENTRIES_QUERY = `
  SELECT
    te.id             AS entry_id,
    te.activity_id    AS activity_id,
    te.started_at     AS started_at,
    te.ended_at       AS ended_at,
    te.duration_seconds AS duration_seconds,
    te.timezone       AS timezone,
    te.note           AS note,
    te.source         AS source,
    a.name            AS activity_name,
    c.name            AS category_name,
    c.color           AS category_color,
    c.icon            AS category_icon
  FROM time_entries te
  JOIN activities a ON a.id = te.activity_id
  JOIN categories c ON c.id = a.category_id
  WHERE te.deleted_at IS NULL
    AND te.started_at <= ?
    AND (te.ended_at IS NULL OR te.ended_at >= ?)
  ORDER BY te.started_at
`;

// ──────────────────────────────────────────────
// Insights Queries
// ──────────────────────────────────────────────

/**
 * Row shape returned by the insights aggregation query.
 */
export interface InsightsCategoryRow {
  category_id: string;
  category_name: string;
  category_color: string;
  category_icon: string | null;
  total_seconds: number;
}

/**
 * SQL query to aggregate tracked time per category for a date range.
 * Clips each entry to the queried range so midnight-spanning entries are
 * split proportionally between days. Running entries (ended_at IS NULL)
 * use the current time as their effective end.
 * Params: [endOfRangeUTC, startOfRangeUTC, endOfRangeUTC, startOfRangeUTC]
 */
export const INSIGHTS_CATEGORY_QUERY = `
  SELECT
    c.id              AS category_id,
    c.name            AS category_name,
    c.color           AS category_color,
    c.icon            AS category_icon,
    COALESCE(SUM(
      MAX(0, CAST(
        (MIN(julianday(?), julianday(COALESCE(te.ended_at, 'now')))
         - MAX(julianday(?), julianday(te.started_at))) * 86400 AS INTEGER
      ))
    ), 0) AS total_seconds
  FROM categories c
  LEFT JOIN activities a ON a.category_id = c.id AND a.deleted_at IS NULL
  LEFT JOIN time_entries te ON te.activity_id = a.id
    AND te.deleted_at IS NULL
    AND te.started_at <= ?
    AND (te.ended_at IS NULL OR te.ended_at >= ?)
  WHERE c.is_archived = 0 AND c.deleted_at IS NULL
  GROUP BY c.id
  HAVING total_seconds > 0
  ORDER BY total_seconds DESC
`;

/**
 * Row shape returned by the ideal allocations query.
 */
export interface IdealAllocationRow {
  id: string;
  category_id: string;
  day_of_week: number | null;
  target_minutes_per_day: number;
  /** NULL in the DB for legacy rows — callers should treat it as 'around'. */
  goal_direction: GoalDirection | null;
}

/**
 * SQL query for reactive ideal allocations (for useQuery).
 */
export const IDEAL_ALLOCATIONS_QUERY = `
  SELECT id, category_id, day_of_week, target_minutes_per_day, goal_direction
  FROM ideal_allocations
  WHERE deleted_at IS NULL
`;

/**
 * Row shape returned by the activity breakdown query.
 */
export interface InsightsActivityRow {
  activity_id: string;
  activity_name: string;
  total_seconds: number;
}

/**
 * SQL query to aggregate tracked time per activity within a specific category.
 * Clips each entry to the queried range so midnight-spanning entries are
 * split proportionally between days.
 * Params: [endOfRangeUTC, startOfRangeUTC, endOfRangeUTC, startOfRangeUTC, categoryId]
 */
export const INSIGHTS_ACTIVITY_QUERY = `
  SELECT
    a.id              AS activity_id,
    a.name            AS activity_name,
    COALESCE(SUM(
      MAX(0, CAST(
        (MIN(julianday(?), julianday(COALESCE(te.ended_at, 'now')))
         - MAX(julianday(?), julianday(te.started_at))) * 86400 AS INTEGER
      ))
    ), 0) AS total_seconds
  FROM activities a
  LEFT JOIN time_entries te ON te.activity_id = a.id
    AND te.deleted_at IS NULL
    AND te.started_at <= ?
    AND (te.ended_at IS NULL OR te.ended_at >= ?)
  WHERE a.category_id = ?
    AND a.is_archived = 0
    AND a.deleted_at IS NULL
  GROUP BY a.id
  HAVING total_seconds > 0
  ORDER BY total_seconds DESC
`;

/**
 * Row shape returned by the top-activities aggregation query.
 */
export interface TopActivityRow {
  activity_id: string;
  activity_name: string;
  category_id: string;
  category_name: string;
  category_color: string;
  total_seconds: number;
}

/**
 * SQL query to aggregate tracked time per activity across ALL categories.
 * Clips each entry to the queried range so midnight-spanning entries are
 * split proportionally between days. Joins activity → category for chip
 * color/name.
 * Params: [endOfRangeUTC, startOfRangeUTC, endOfRangeUTC, startOfRangeUTC]
 */
export const TOP_ACTIVITIES_QUERY = `
  SELECT
    a.id              AS activity_id,
    a.name            AS activity_name,
    c.id              AS category_id,
    c.name            AS category_name,
    c.color           AS category_color,
    COALESCE(SUM(
      MAX(0, CAST(
        (MIN(julianday(?), julianday(COALESCE(te.ended_at, 'now')))
         - MAX(julianday(?), julianday(te.started_at))) * 86400 AS INTEGER
      ))
    ), 0) AS total_seconds
  FROM activities a
  JOIN categories c ON c.id = a.category_id
  LEFT JOIN time_entries te ON te.activity_id = a.id
    AND te.deleted_at IS NULL
    AND te.started_at <= ?
    AND (te.ended_at IS NULL OR te.ended_at >= ?)
  WHERE a.is_archived = 0
    AND a.deleted_at IS NULL
    AND c.is_archived = 0
    AND c.deleted_at IS NULL
  GROUP BY a.id
  HAVING total_seconds > 0
  ORDER BY total_seconds DESC
`;

// ──────────────────────────────────────────────
// Ideal Allocations
// ──────────────────────────────────────────────

/** Get all ideal allocations */
export async function getIdealAllocations(): Promise<IdealAllocationRecord[]> {
  return db.getAll<IdealAllocationRecord>(
    `SELECT * FROM ideal_allocations WHERE deleted_at IS NULL`
  );
}

/** Get all ideal allocations for a specific category. */
export async function getIdealAllocationsForCategory(
  categoryId: string
): Promise<IdealAllocationRecord[]> {
  return db.getAll<IdealAllocationRecord>(
    `SELECT * FROM ideal_allocations
     WHERE category_id = ? AND deleted_at IS NULL`,
    [categoryId]
  );
}

/**
 * Upsert ideal allocation for (category, day_of_week).
 * `dayOfWeek`: 0=Mon … 6=Sun, or null for "every day".
 * `goalDirection`: 'at_least' | 'at_most' | 'around'.
 */
export async function setIdealAllocation(params: {
  categoryId: string;
  dayOfWeek: number | null;
  targetMinutesPerDay: number;
  goalDirection: GoalDirection;
}): Promise<void> {
  const now = nowUTC();
  // SQLite: `day_of_week IS ?` treats NULL correctly when parameter is null.
  const existing = await db.getOptional<IdealAllocationRecord>(
    `SELECT * FROM ideal_allocations
     WHERE category_id = ? AND day_of_week IS ? AND deleted_at IS NULL`,
    [params.categoryId, params.dayOfWeek]
  );

  if (existing) {
    await db.execute(
      `UPDATE ideal_allocations
       SET target_minutes_per_day = ?, goal_direction = ?, updated_at = ?
       WHERE id = ?`,
      [params.targetMinutesPerDay, params.goalDirection, now, existing.id]
    );
  } else {
    const id = generateId();
    await db.execute(
      `INSERT INTO ideal_allocations
         (id, user_id, category_id, day_of_week, target_minutes_per_day, goal_direction, created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        params.categoryId,
        params.dayOfWeek,
        params.targetMinutesPerDay,
        params.goalDirection,
        now,
        now,
      ]
    );
  }
}

/**
 * Soft-delete an ideal allocation row.
 * Pass `dayOfWeek: null` to clear the "every day" row, a weekday index to
 * clear a specific override, or use `clearAllIdealAllocationsForCategory`
 * to wipe all rows for a category.
 */
export async function clearIdealAllocation(
  categoryId: string,
  dayOfWeek: number | null
): Promise<void> {
  const now = nowUTC();
  await db.execute(
    `UPDATE ideal_allocations
     SET deleted_at = ?, updated_at = ?
     WHERE category_id = ? AND day_of_week IS ? AND deleted_at IS NULL`,
    [now, now, categoryId, dayOfWeek]
  );
}

/** Soft-delete every allocation row for a category. */
export async function clearAllIdealAllocationsForCategory(
  categoryId: string
): Promise<void> {
  const now = nowUTC();
  await db.execute(
    `UPDATE ideal_allocations
     SET deleted_at = ?, updated_at = ?
     WHERE category_id = ? AND deleted_at IS NULL`,
    [now, now, categoryId]
  );
}

// ──────────────────────────────────────────────
// Notification Preferences
// ──────────────────────────────────────────────

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
         created_at, updated_at, deleted_at
  FROM notification_preferences
  WHERE deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1
`;

/** Fetch the singleton notification preferences row (one-shot). */
export async function getNotificationPreferences(): Promise<NotificationPreferencesRecord | null> {
  return db.getOptional<NotificationPreferencesRecord>(NOTIFICATION_PREFERENCES_QUERY);
}

export interface NotificationPreferencesPatch {
  idle_reminder_enabled?: number;
  long_running_enabled?: number;
  threshold_override_seconds?: number | null;
  has_asked_permission?: number;
}

/** Partial update of the singleton preferences row. */
export async function updateNotificationPreferences(
  patch: NotificationPreferencesPatch
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (patch.idle_reminder_enabled !== undefined) {
    fields.push('idle_reminder_enabled = ?');
    values.push(patch.idle_reminder_enabled);
  }
  if (patch.long_running_enabled !== undefined) {
    fields.push('long_running_enabled = ?');
    values.push(patch.long_running_enabled);
  }
  if (patch.threshold_override_seconds !== undefined) {
    fields.push('threshold_override_seconds = ?');
    values.push(patch.threshold_override_seconds);
  }
  if (patch.has_asked_permission !== undefined) {
    fields.push('has_asked_permission = ?');
    values.push(patch.has_asked_permission);
  }

  if (fields.length === 0) return;

  const now = nowUTC();
  fields.push('updated_at = ?');
  values.push(now);

  await db.execute(
    `UPDATE notification_preferences
     SET ${fields.join(', ')}
     WHERE deleted_at IS NULL`,
    values
  );
}

/**
 * Returns rows of duration_seconds for the given category's completed entries
 * in the last 30 days, excluding retroactive/import sources and clipping to
 * [60s, 43200s] to drop accidental taps and forgotten-timer outliers.
 */
export const MEDIAN_DURATION_QUERY = `
  SELECT te.duration_seconds AS duration_seconds
  FROM time_entries te
  JOIN activities a ON a.id = te.activity_id
  WHERE a.category_id = ?
    AND te.deleted_at IS NULL
    AND te.ended_at IS NOT NULL
    AND te.started_at >= ?
    AND te.source IN ('timer','manual')
    AND te.duration_seconds BETWEEN 60 AND 43200
  ORDER BY te.duration_seconds
`;

function median(sortedValues: number[]): number {
  const n = sortedValues.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sortedValues[mid];
  return (sortedValues[mid - 1] + sortedValues[mid]) / 2;
}

/**
 * Compute the long-running reminder threshold (seconds) for a category.
 * threshold = max(1.5 * median(recent durations), 45 min).
 * Falls back to 45 min floor when there is no recent history.
 */
export async function computeCategoryThreshold(
  categoryId: string
): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await db.getAll<{ duration_seconds: number }>(
    MEDIAN_DURATION_QUERY,
    [categoryId, thirtyDaysAgo]
  );
  if (rows.length === 0) return LONG_RUNNING_MIN_THRESHOLD_SECONDS;
  const sorted = rows.map((r) => r.duration_seconds);
  const m = median(sorted);
  return Math.max(Math.round(1.5 * m), LONG_RUNNING_MIN_THRESHOLD_SECONDS);
}
