import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import type { CategoryWithActivities } from '@/db/models';

/**
 * SQL query that fetches all active categories joined with their activities,
 * ordered by frequency of use derived from time_entries.
 *
 * Categories are ordered by their total time_entry count (most-used first),
 * and activities within each category are ordered by their own entry count.
 * Ties fall back to alphabetical name so new users still see a stable order.
 */
const QUICK_SWITCH_QUERY = `
  SELECT
    c.id          AS category_id,
    c.name        AS category_name,
    c.color       AS category_color,
    c.icon        AS category_icon,
    c.is_preset   AS category_is_preset,
    c.sort_order  AS category_sort_order,
    a.id          AS activity_id,
    a.name        AS activity_name,
    a.is_preset   AS activity_is_preset,
    COALESCE(act_counts.entry_count, 0)     AS activity_entry_count,
    COALESCE(cat_counts.cat_entry_count, 0) AS category_entry_count
  FROM categories c
  LEFT JOIN activities a
    ON a.category_id = c.id
    AND a.is_archived = 0
    AND a.deleted_at IS NULL
  LEFT JOIN (
    SELECT activity_id, COUNT(*) AS entry_count
    FROM time_entries
    WHERE deleted_at IS NULL
    GROUP BY activity_id
  ) act_counts ON act_counts.activity_id = a.id
  LEFT JOIN (
    SELECT a2.category_id, COUNT(*) AS cat_entry_count
    FROM time_entries te
    JOIN activities a2 ON a2.id = te.activity_id
    WHERE te.deleted_at IS NULL
    GROUP BY a2.category_id
  ) cat_counts ON cat_counts.category_id = c.id
  WHERE c.is_archived = 0
    AND c.deleted_at IS NULL
  ORDER BY category_entry_count DESC, c.sort_order, activity_entry_count DESC, a.name
`;

interface FlatRow {
  category_id: string;
  category_name: string;
  category_color: string;
  category_icon: string | null;
  category_is_preset: number;
  category_sort_order: number;
  activity_id: string | null;
  activity_name: string | null;
  activity_is_preset: number | null;
  activity_entry_count: number;
  category_entry_count: number;
}

export interface UseQuickSwitchDataResult {
  categories: CategoryWithActivities[];
  isLoading: boolean;
}

/**
 * Reactive hook that returns all active categories with their activities,
 * ordered by frequency of use (most-used categories and activities first).
 *
 * Auto-updates when the underlying categories, activities, or time_entries
 * tables change.
 */
export function useQuickSwitchData(): UseQuickSwitchDataResult {
  const { data, isLoading } = useQuery<FlatRow>(QUICK_SWITCH_QUERY);

  const categories = useMemo((): CategoryWithActivities[] => {
    const map = new Map<string, CategoryWithActivities>();

    for (const row of data) {
      let category = map.get(row.category_id);

      if (!category) {
        category = {
          id: row.category_id,
          name: row.category_name,
          color: row.category_color,
          icon: row.category_icon,
          isPreset: row.category_is_preset === 1,
          sortOrder: row.category_sort_order,
          activities: [],
        };
        map.set(row.category_id, category);
      }

      if (row.activity_id && row.activity_name) {
        category.activities.push({
          id: row.activity_id,
          categoryId: row.category_id,
          categoryName: row.category_name,
          categoryColor: row.category_color,
          name: row.activity_name,
          isPreset: row.activity_is_preset === 1,
        });
      }
    }

    return Array.from(map.values());
  }, [data]);

  return { categories, isLoading };
}
