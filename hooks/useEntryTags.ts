import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import type { TagItem } from '@/db/models';

const ENTRY_TAGS_QUERY = `
  SELECT t.id          AS id,
         t.name        AS name,
         t.color       AS color,
         t.sort_order  AS sort_order
  FROM tags t
  JOIN entry_tags et ON et.tag_id = t.id
  WHERE et.entry_id = ?
    AND t.deleted_at IS NULL
  ORDER BY t.sort_order, t.name
`;

interface FlatRow {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

export interface UseEntryTagsResult {
  tags: TagItem[];
  isLoading: boolean;
}

/** Reactive list of tags applied to a single time entry. */
export function useEntryTags(entryId: string | null): UseEntryTagsResult {
  const { data, isLoading } = useQuery<FlatRow>(
    ENTRY_TAGS_QUERY,
    entryId ? [entryId] : ['__none__'],
  );

  const tags = useMemo<TagItem[]>(
    () =>
      entryId
        ? data.map((r) => ({
            id: r.id,
            name: r.name,
            color: r.color,
            sortOrder: r.sort_order,
          }))
        : [],
    [data, entryId],
  );

  return { tags, isLoading };
}
