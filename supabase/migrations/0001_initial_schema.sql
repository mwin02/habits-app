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
  deleted_at        timestamptz
);
create index time_entries_by_started  on time_entries (started_at);
create index time_entries_by_activity on time_entries (activity_id, started_at);
create index time_entries_by_user     on time_entries (user_id);

-- Enforce the actual product invariant: at most one running (ended_at IS NULL)
-- entry per user at a time. This handles the multi-device race where two
-- devices try to insert a running entry concurrently and the auto-close
-- trigger below didn't see the other in flight.
--
-- We deliberately do NOT enforce overlap exclusion on closed entries — the
-- client allows overlaps in retroactive/edit flows today, and a future
-- "multi-tasking" feature would only widen that. Data-quality checks for
-- overlapping closed entries belong in the analytics layer (insights
-- queries already clip ranges, see CLAUDE.md "Range aggregations must clip
-- entry durations").
--
-- Doubles as the fast lookup index for "find my running entry".
create unique index time_entries_one_running_per_user
  on time_entries (user_id)
  where ended_at is null and deleted_at is null;

-- Multi-device running-timer reconciliation: before inserting/updating a
-- running entry, auto-close any other running entry for the same user.
-- Without this, two devices both racing to start a timer would each insert
-- a row with ended_at IS NULL and the unique partial index above would
-- reject the loser. With this trigger, the second insert closes the first
-- before its own row hits the index.
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
-- entry_tags
-- =========================================================================
-- Carries a denormalized `user_id` matching the parent entry. Two reasons:
--   1. PowerSync sync rule data queries must be single-table flat SELECTs
--      (no JOINs), so we need user_id on the row itself to scope buckets.
--   2. RLS gets simpler and cheaper: `user_id = auth.uid()` instead of a
--      correlated EXISTS subquery against time_entries.
-- A BEFORE INSERT/UPDATE trigger keeps user_id consistent with the parent
-- entry, so clients never have to set it explicitly.
create table entry_tags (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  entry_id    uuid        not null references time_entries(id) on delete cascade,
  tag_id      uuid        not null references tags(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index entry_tags_by_entry on entry_tags (entry_id);
create index entry_tags_by_tag   on entry_tags (tag_id);
create index entry_tags_by_user  on entry_tags (user_id);

-- Force entry_tags.user_id to match the parent time_entries.user_id and the
-- referenced tag's user_id. Rejects mismatches outright (covers the edge
-- case where a client sends the wrong user_id; the RLS WITH CHECK then
-- can't be tricked).
create or replace function entry_tags_sync_user_id()
returns trigger
language plpgsql
as $$
declare
  v_entry_user uuid;
  v_tag_user   uuid;
begin
  select user_id into v_entry_user from time_entries where id = new.entry_id;
  select user_id into v_tag_user   from tags         where id = new.tag_id;

  if v_entry_user is null then
    raise exception 'entry_tags.entry_id % does not reference a valid entry', new.entry_id;
  end if;
  if v_tag_user is null then
    raise exception 'entry_tags.tag_id % does not reference a valid tag', new.tag_id;
  end if;
  if v_entry_user <> v_tag_user then
    raise exception 'entry_tags: entry and tag belong to different users';
  end if;

  new.user_id := v_entry_user;
  return new;
end;
$$;

create trigger entry_tags_set_user_id
  before insert or update on entry_tags
  for each row execute function entry_tags_sync_user_id();

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
