import { column, Schema, Table } from '@powersync/react-native';

/**
 * PowerSync schema for the Habits time-tracking app.
 *
 * All tables are localOnly for now — no sync to Supabase yet.
 * When we add sync (Phase 3), we'll remove localOnly and connect
 * to a PowerSync service instance.
 *
 * Note: PowerSync auto-creates an `id` TEXT column on every table.
 * All timestamps are stored as ISO 8601 strings in UTC.
 */

const categories = new Table(
  {
    user_id: column.text,         // null = system preset
    name: column.text,
    color: column.text,
    icon: column.text,
    is_preset: column.integer,    // 0 or 1 (SQLite has no boolean)
    sort_order: column.integer,
    is_archived: column.integer,  // 0 or 1
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,      // null = not deleted (soft delete for future sync)
  },
  { localOnly: true, indexes: { by_sort: ['sort_order'] } }
);

const activities = new Table(
  {
    user_id: column.text,         // null = system preset
    category_id: column.text,
    name: column.text,
    is_preset: column.integer,    // 0 or 1
    sort_order: column.integer,
    is_archived: column.integer,  // 0 or 1
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
  },
  { localOnly: true, indexes: { by_category: ['category_id'] } }
);

const time_entries = new Table(
  {
    user_id: column.text,         // null until account created (deferred auth)
    activity_id: column.text,
    started_at: column.text,      // ISO 8601 UTC
    ended_at: column.text,        // null = currently running
    duration_seconds: column.integer, // pre-computed on end for fast aggregation
    timezone: column.text,        // IANA timezone at creation (e.g. 'America/New_York')
    note: column.text,
    source: column.text,          // 'timer' | 'manual' | 'retroactive' | 'import'
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
  },
  {
    localOnly: true,
    indexes: {
      by_started: ['started_at'],
      by_running: ['ended_at'],
      by_activity: ['activity_id', 'started_at'],
    },
  }
);

const ideal_allocations = new Table(
  {
    user_id: column.text,
    category_id: column.text,
    target_minutes_per_day: column.integer,
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
  },
  { localOnly: true, indexes: { by_category: ['category_id'] } }
);

const daily_summaries = new Table(
  {
    user_id: column.text,
    date: column.text,            // 'YYYY-MM-DD' in local timezone
    category_id: column.text,
    total_minutes: column.integer,
    entry_count: column.integer,
    computed_at: column.text,
  },
  { localOnly: true, indexes: { by_date: ['date'], by_lookup: ['date', 'category_id'] } }
);

export const AppSchema = new Schema({
  categories,
  activities,
  time_entries,
  ideal_allocations,
  daily_summaries,
});

export type Database = (typeof AppSchema)['types'];
export type CategoryRecord = Database['categories'];
export type ActivityRecord = Database['activities'];
export type TimeEntryRecord = Database['time_entries'];
export type IdealAllocationRecord = Database['ideal_allocations'];
export type DailySummaryRecord = Database['daily_summaries'];
