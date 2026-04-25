import { db } from '@/lib/powersync';
import { generateId } from '@/lib/uuid';
import type { TimeEntryRecord } from '../schema';
import { nowUTC } from './_helpers';

/** Get the currently running time entry (if any) */
export async function getRunningEntry(): Promise<TimeEntryRecord | null> {
  return db.getOptional<TimeEntryRecord>(
    `SELECT * FROM time_entries
     WHERE ended_at IS NULL AND deleted_at IS NULL
     ORDER BY started_at DESC
     LIMIT 1`
  );
}

/**
 * Start a new time entry (timer mode). Optionally attaches a set of tags
 * inside the same transaction so the entry never exists tagless on disk.
 */
export async function startEntry(params: {
  activityId: string;
  timezone: string;
  tagIds?: string[];
}): Promise<string> {
  const id = generateId();
  const now = nowUTC();
  const tagIds = params.tagIds && params.tagIds.length > 0
    ? Array.from(new Set(params.tagIds))
    : null;

  if (tagIds) {
    await db.writeTransaction(async (tx) => {
      await tx.execute(
        `INSERT INTO time_entries (id, user_id, activity_id, started_at, ended_at, duration_seconds, timezone, note, source, created_at, updated_at)
         VALUES (?, NULL, ?, ?, NULL, NULL, ?, NULL, 'timer', ?, ?)`,
        [id, params.activityId, now, params.timezone, now, now]
      );
      for (const tagId of tagIds) {
        await tx.execute(
          `INSERT INTO entry_tags (id, entry_id, tag_id, created_at)
           VALUES (?, ?, ?, ?)`,
          [generateId(), id, tagId, now]
        );
      }
    });
  } else {
    await db.execute(
      `INSERT INTO time_entries (id, user_id, activity_id, started_at, ended_at, duration_seconds, timezone, note, source, created_at, updated_at)
       VALUES (?, NULL, ?, ?, NULL, NULL, ?, NULL, 'timer', ?, ?)`,
      [id, params.activityId, now, params.timezone, now, now]
    );
  }
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
