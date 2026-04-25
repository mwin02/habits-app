import { db } from '@/lib/powersync';
import { generateId } from '@/lib/uuid';
import type { TagRecord } from '../schema';
import { nowUTC } from './_helpers';

/**
 * Reactive query: every (entry_id, tag_id) pair for time entries that
 * overlap a UTC date range. Used by useTimelineData to dim entries that
 * don't match the selected tag filter.
 * Params: [endOfRangeUTC, startOfRangeUTC]
 */
export const ENTRY_TAGS_BY_RANGE_QUERY = `
  SELECT et.entry_id AS entry_id, et.tag_id AS tag_id
  FROM entry_tags et
  JOIN time_entries te ON te.id = et.entry_id
  WHERE te.deleted_at IS NULL
    AND te.started_at <= ?
    AND (te.ended_at IS NULL OR te.ended_at >= ?)
`;

/** Reactive query for all active tags. Use with `useQuery`. */
export const TAGS_QUERY = `
  SELECT id, user_id, name, color, sort_order, is_archived,
         created_at, updated_at, deleted_at
  FROM tags
  WHERE is_archived = 0 AND deleted_at IS NULL
  ORDER BY sort_order, name
`;

/** Get all active tags (one-shot). */
export async function getAllTags(): Promise<TagRecord[]> {
  return db.getAll<TagRecord>(TAGS_QUERY);
}

/** Get all tags applied to a single time entry. */
export async function getTagsForEntry(entryId: string): Promise<TagRecord[]> {
  return db.getAll<TagRecord>(
    `SELECT t.id, t.user_id, t.name, t.color, t.sort_order, t.is_archived,
            t.created_at, t.updated_at, t.deleted_at
     FROM tags t
     JOIN entry_tags et ON et.tag_id = t.id
     WHERE et.entry_id = ?
       AND t.deleted_at IS NULL
     ORDER BY t.sort_order, t.name`,
    [entryId]
  );
}

/** Create a new tag. Returns the new tag id. */
export async function createTag(params: {
  name: string;
  color: string;
  sortOrder?: number;
}): Promise<string> {
  const id = generateId();
  const now = nowUTC();
  await db.execute(
    `INSERT INTO tags (id, user_id, name, color, sort_order, is_archived, created_at, updated_at)
     VALUES (?, NULL, ?, ?, ?, 0, ?, ?)`,
    [id, params.name, params.color, params.sortOrder ?? 0, now, now]
  );
  return id;
}

/** Update name / color / sort order of a tag. */
export async function updateTag(
  id: string,
  params: Partial<{ name: string; color: string; sortOrder: number }>
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (params.name !== undefined) { sets.push('name = ?'); values.push(params.name); }
  if (params.color !== undefined) { sets.push('color = ?'); values.push(params.color); }
  if (params.sortOrder !== undefined) { sets.push('sort_order = ?'); values.push(params.sortOrder); }

  if (sets.length === 0) return;

  sets.push('updated_at = ?');
  values.push(nowUTC());
  values.push(id);

  await db.execute(
    `UPDATE tags SET ${sets.join(', ')} WHERE id = ?`,
    values
  );
}

/** Convenience wrapper that only changes the tag name. */
export async function renameTag(id: string, name: string): Promise<void> {
  await updateTag(id, { name });
}

/** Soft-archive a tag. Existing entry_tags rows are preserved so unarchiving restores history. */
export async function archiveTag(id: string): Promise<void> {
  await db.execute(
    'UPDATE tags SET is_archived = 1, updated_at = ? WHERE id = ?',
    [nowUTC(), id]
  );
}

/** Unarchive a previously archived tag. */
export async function unarchiveTag(id: string): Promise<void> {
  await db.execute(
    'UPDATE tags SET is_archived = 0, updated_at = ? WHERE id = ?',
    [nowUTC(), id]
  );
}

/**
 * Replace the set of tags on an entry to exactly the given list.
 * Diffs current vs desired so we only touch rows that actually change.
 * Pass an empty array to clear all tags from the entry.
 */
export async function setEntryTags(entryId: string, tagIds: string[]): Promise<void> {
  const desired = Array.from(new Set(tagIds));

  await db.writeTransaction(async (tx) => {
    const existing = await tx.getAll<{ tag_id: string }>(
      'SELECT tag_id FROM entry_tags WHERE entry_id = ?',
      [entryId]
    );
    const existingIds = new Set(existing.map((r) => r.tag_id));
    const desiredSet = new Set(desired);

    const toAdd = desired.filter((id) => !existingIds.has(id));
    const toRemove = [...existingIds].filter((id) => !desiredSet.has(id));

    const now = nowUTC();
    for (const tagId of toAdd) {
      await tx.execute(
        `INSERT INTO entry_tags (id, entry_id, tag_id, created_at)
         VALUES (?, ?, ?, ?)`,
        [generateId(), entryId, tagId, now]
      );
    }
    for (const tagId of toRemove) {
      await tx.execute(
        'DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?',
        [entryId, tagId]
      );
    }
  });
}
