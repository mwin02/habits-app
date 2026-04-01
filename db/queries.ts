import { db } from '@/lib/powersync';
import { generateId } from '@/lib/uuid';
import type {
  CategoryRecord,
  ActivityRecord,
  TimeEntryRecord,
  IdealAllocationRecord,
} from './schema';
import type { TimeEntrySource } from './models';

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
// Ideal Allocations
// ──────────────────────────────────────────────

/** Get all ideal allocations */
export async function getIdealAllocations(): Promise<IdealAllocationRecord[]> {
  return db.getAll<IdealAllocationRecord>(
    `SELECT * FROM ideal_allocations WHERE deleted_at IS NULL`
  );
}

/** Set ideal allocation for a category (upsert) */
export async function setIdealAllocation(params: {
  categoryId: string;
  targetMinutesPerDay: number;
}): Promise<void> {
  const now = nowUTC();
  const existing = await db.getOptional<IdealAllocationRecord>(
    'SELECT * FROM ideal_allocations WHERE category_id = ? AND deleted_at IS NULL',
    [params.categoryId]
  );

  if (existing) {
    await db.execute(
      'UPDATE ideal_allocations SET target_minutes_per_day = ?, updated_at = ? WHERE id = ?',
      [params.targetMinutesPerDay, now, existing.id]
    );
  } else {
    const id = generateId();
    await db.execute(
      `INSERT INTO ideal_allocations (id, user_id, category_id, target_minutes_per_day, created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, ?)`,
      [id, params.categoryId, params.targetMinutesPerDay, now, now]
    );
  }
}
