import { db } from '@/lib/powersync';
import { generateId } from '@/lib/uuid';
import type { CategoryRecord } from '../schema';
import { nowUTC } from './_helpers';

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
