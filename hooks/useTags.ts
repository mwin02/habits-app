import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { TAGS_QUERY } from '@/db/queries';
import type { TagItem } from '@/db/models';

interface FlatRow {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

export interface UseTagsResult {
  tags: TagItem[];
  isLoading: boolean;
}

/** Reactive list of all active (non-archived, non-deleted) tags. */
export function useTags(): UseTagsResult {
  const { data, isLoading } = useQuery<FlatRow>(TAGS_QUERY);

  const tags = useMemo<TagItem[]>(
    () =>
      data.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        sortOrder: r.sort_order,
      })),
    [data],
  );

  return { tags, isLoading };
}
