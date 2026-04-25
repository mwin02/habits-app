import { db } from '@/lib/powersync';
import { generateId } from '@/lib/uuid';
import type { ActivityRecord } from '../schema';
import { nowUTC } from './_helpers';

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
