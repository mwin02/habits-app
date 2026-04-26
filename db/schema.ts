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
    // Per-activity icon override — NULL means inherit from parent category.
    // Color stays category-owned: color is the grouping signal across timeline
    // and insights, so per-activity color would dilute it. Resolve via SQL
    // `COALESCE(a.icon, c.icon)` at every display site.
    icon: column.text,
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
    source: column.text,          // closed TS union: see TimeEntrySource in db/models.ts. All writes must go through TIME_ENTRY_SOURCES in db/queries/_helpers.ts.
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
    // 0=Mon … 6=Sun. NULL = applies to every day (default).
    day_of_week: column.integer,
    target_minutes_per_day: column.integer,
    // 'at_least' | 'at_most' | 'around'. NULL = 'around' (legacy rows).
    goal_direction: column.text,
    // 'daily' | 'weekly' | 'monthly'. NULL = 'daily' (legacy rows).
    // Weekly/monthly rows ignore day_of_week and target the period total.
    period_kind: column.text,
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
  },
  {
    localOnly: true,
    indexes: {
      by_category: ['category_id'],
      by_category_day: ['category_id', 'day_of_week'],
    },
  }
);

const notification_preferences = new Table(
  {
    user_id: column.text,
    idle_reminder_enabled: column.integer,       // 0 or 1
    long_running_enabled: column.integer,        // 0 or 1
    threshold_override_seconds: column.integer,  // null = compute from median
    has_asked_permission: column.integer,        // 0 or 1
    quiet_hours_enabled: column.integer,         // 0 or 1, null treated as 0
    quiet_hours_start: column.text,              // 'HH:MM' 24h local time
    quiet_hours_end: column.text,                // 'HH:MM'; if end <= start, window wraps midnight
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
  },
  { localOnly: true }
);

const tags = new Table(
  {
    user_id: column.text,         // null until account created (deferred auth)
    name: column.text,
    color: column.text,
    sort_order: column.integer,
    is_archived: column.integer,  // 0 or 1
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
  },
  { localOnly: true, indexes: { by_sort: ['sort_order'] } }
);

// Join table: many-to-many between time_entries and tags.
// PowerSync auto-creates an `id` column. We dedupe (entry_id, tag_id) pairs
// in `setEntryTags` rather than relying on a DB-level UNIQUE constraint.
const entry_tags = new Table(
  {
    entry_id: column.text,
    tag_id: column.text,
    created_at: column.text,
  },
  {
    localOnly: true,
    indexes: {
      by_entry: ['entry_id'],
      by_tag: ['tag_id'],
    },
  }
);

// Singleton row of general user-scoped preferences. Notification prefs live
// in their own table — keep this one for non-notification settings so it
// doesn't grow into a kitchen sink. NULL columns mean "use default" so
// pre-table-write rows stay sensible.
const user_preferences = new Table(
  {
    user_id: column.text,
    week_start_day: column.integer,        // 0=Mon … 6=Sun. NULL = 0/Mon (legacy).
    default_insights_period: column.text,  // 'daily' | 'weekly' | 'monthly'. NULL = 'daily'.
    default_timezone: column.text,         // IANA tz string. NULL = device tz.
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
  },
  { localOnly: true }
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
  notification_preferences,
  tags,
  entry_tags,
  user_preferences,
  daily_summaries,
});

export type Database = (typeof AppSchema)['types'];
export type CategoryRecord = Database['categories'];
export type ActivityRecord = Database['activities'];
export type TimeEntryRecord = Database['time_entries'];
export type IdealAllocationRecord = Database['ideal_allocations'];
export type NotificationPreferencesRecord = Database['notification_preferences'];
export type TagRecord = Database['tags'];
export type EntryTagRecord = Database['entry_tags'];
export type UserPreferencesRecord = Database['user_preferences'];
export type DailySummaryRecord = Database['daily_summaries'];
