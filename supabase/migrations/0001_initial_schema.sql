-- Phase 3 — Initial schema for Habits app cloud sync.
--
-- Mirrors db/schema.ts. Booleans use BOOLEAN in Postgres; PowerSync converts
-- to 0/1 INTEGER on the SQLite client. Timestamps use TIMESTAMPTZ; PowerSync
-- serializes to ISO 8601 strings on the client.
--
-- Presets live in `categories` / `activities` with `user_id IS NULL` and
-- `is_preset = true`. Sync rules expose them globally; RLS keeps them
-- read-only for end users (only this migration / seed.sql writes them).

-- uuid-ossp gives us uuid_generate_v5 (used in seed.sql for deterministic
-- preset IDs). gen_random_uuid() comes from pgcrypto / Postgres core and is
-- already in the public search_path on Supabase, so we use it for column
-- defaults to avoid the `extensions.` schema qualifier on every table.
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "btree_gist";

-- =========================================================================
-- categories
-- =========================================================================
create table categories (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        references auth.users(id) on delete cascade,
  name            text        not null,
  color           text        not null,
  icon            text        not null,
  is_preset       boolean     not null default false,
  sort_order      integer     not null default 0,
  is_archived     boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  -- Presets must have NULL user_id; user-owned rows must have user_id set.
  constraint categories_preset_ownership check (
    (is_preset = true  and user_id is null) or
    (is_preset = false and user_id is not null)
  )
);
create index categories_by_sort     on categories (sort_order);
create index categories_by_user     on categories (user_id);

-- =========================================================================
-- activities
-- =========================================================================
create table activities (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        references auth.users(id) on delete cascade,
  category_id     uuid        not null references categories(id) on delete cascade,
  name            text        not null,
  -- NULL = inherit icon from parent category. Color stays category-owned.
  icon            text,
  is_preset       boolean     not null default false,
  sort_order      integer     not null default 0,
  is_archived     boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint activities_preset_ownership check (
    (is_preset = true  and user_id is null) or
    (is_preset = false and user_id is not null)
  )
);
create index activities_by_category on activities (category_id);
create index activities_by_user     on activities (user_id);

-- =========================================================================
-- time_entries
-- =========================================================================
create table time_entries (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  activity_id       uuid        not null references activities(id),
  started_at        timestamptz not null,
  ended_at          timestamptz,
  duration_seconds  integer,
  timezone          text        not null,
  note              text,
  source            text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  -- No two non-deleted entries from the same user may overlap in time.
  -- A NULL ended_at means the entry is still running (open-ended range).
  constraint time_entries_no_overlap exclude using gist (
    user_id with =,
    tstzrange(started_at, coalesce(ended_at, 'infinity'::timestamptz)) with &&
  ) where (deleted_at is null)
);
create index time_entries_by_started  on time_entries (started_at);
create index time_entries_by_running  on time_entries (user_id) where (ended_at is null and deleted_at is null);
create index time_entries_by_activity on time_entries (activity_id, started_at);
create index time_entries_by_user     on time_entries (user_id);

-- Multi-device running-timer reconciliation: before inserting/updating a
-- running entry, auto-close any other running entry for the same user.
-- Avoids exclusion-constraint conflicts when device A starts a timer while
-- device B already had one running.
create or replace function close_running_entries_for_user()
returns trigger
language plpgsql
as $$
begin
  if new.ended_at is null and new.deleted_at is null then
    update time_entries
       set ended_at        = new.started_at,
           duration_seconds = greatest(
             0,
             extract(epoch from (new.started_at - started_at))::int
           ),
           updated_at      = now()
     where user_id    = new.user_id
       and id        <> new.id
       and ended_at   is null
       and deleted_at is null;
  end if;
  return new;
end;
$$;

create trigger time_entries_close_running
  before insert or update on time_entries
  for each row execute function close_running_entries_for_user();

-- =========================================================================
-- ideal_allocations
-- =========================================================================
create table ideal_allocations (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 uuid        not null references auth.users(id) on delete cascade,
  category_id             uuid        not null references categories(id) on delete cascade,
  -- 0=Mon … 6=Sun. NULL = applies every day.
  day_of_week             integer,
  target_minutes_per_day  integer     not null,
  -- 'at_least' | 'at_most' | 'around'. NULL = 'around'.
  goal_direction          text,
  -- 'daily' | 'weekly' | 'monthly'. NULL = 'daily'.
  period_kind             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz
);
create index ideal_allocations_by_category     on ideal_allocations (category_id);
create index ideal_allocations_by_category_day on ideal_allocations (category_id, day_of_week);
create index ideal_allocations_by_user         on ideal_allocations (user_id);

-- =========================================================================
-- notification_preferences
-- =========================================================================
create table notification_preferences (
  id                          uuid        primary key default gen_random_uuid(),
  user_id                     uuid        not null references auth.users(id) on delete cascade,
  idle_reminder_enabled       boolean     not null default false,
  long_running_enabled        boolean     not null default false,
  threshold_override_seconds  integer,
  has_asked_permission        boolean     not null default false,
  quiet_hours_enabled         boolean,
  quiet_hours_start           text,
  quiet_hours_end             text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  deleted_at                  timestamptz
);
create index notification_preferences_by_user on notification_preferences (user_id);

-- =========================================================================
-- tags
-- =========================================================================
create table tags (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  name         text        not null,
  color        text        not null,
  sort_order   integer     not null default 0,
  is_archived  boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index tags_by_sort on tags (sort_order);
create index tags_by_user on tags (user_id);

-- =========================================================================
-- entry_tags  (no user_id; scope follows time_entries)
-- =========================================================================
create table entry_tags (
  id          uuid        primary key default gen_random_uuid(),
  entry_id    uuid        not null references time_entries(id) on delete cascade,
  tag_id      uuid        not null references tags(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index entry_tags_by_entry on entry_tags (entry_id);
create index entry_tags_by_tag   on entry_tags (tag_id);

-- =========================================================================
-- user_preferences  (singleton per user)
-- =========================================================================
create table user_preferences (
  id                       uuid        primary key default gen_random_uuid(),
  user_id                  uuid        not null unique references auth.users(id) on delete cascade,
  week_start_day           integer,
  default_insights_period  text,
  default_timezone         text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  deleted_at               timestamptz
);

-- daily_summaries is intentionally NOT created here — it stays a local-only
-- cache on the client (see db/schema.ts).
