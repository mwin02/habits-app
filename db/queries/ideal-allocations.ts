import { db } from '@/lib/powersync';
import { generateId } from '@/lib/uuid';
import type { IdealAllocationRecord } from '../schema';
import type { GoalDirection } from '../models';
import { nowUTC } from './_helpers';

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
