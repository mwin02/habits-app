-- Phase 3 — Row-Level Security policies.
--
-- This repo is public on GitHub: every committed schema is world-readable.
-- The mobile client only ever ships the anon key, so RLS is the only thing
-- standing between user A and user B's rows. Every table gets RLS enabled
-- and explicit policies for SELECT, INSERT, UPDATE, DELETE.

-- =========================================================================
-- categories
-- =========================================================================
alter table categories enable row level security;

-- Read: presets (user_id IS NULL) are visible to every authed user;
-- otherwise only the owner sees their rows.
create policy categories_select on categories
  for select to authenticated
  using (user_id is null or user_id = auth.uid());

-- Writes: only your own rows. Presets are read-only to clients (this
-- migration / seed.sql write them with the service role).
create policy categories_insert on categories
  for insert to authenticated
  with check (user_id = auth.uid() and is_preset = false);

create policy categories_update on categories
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and is_preset = false);

create policy categories_delete on categories
  for delete to authenticated
  using (user_id = auth.uid());

-- =========================================================================
-- activities
-- =========================================================================
alter table activities enable row level security;

create policy activities_select on activities
  for select to authenticated
  using (user_id is null or user_id = auth.uid());

create policy activities_insert on activities
  for insert to authenticated
  with check (user_id = auth.uid() and is_preset = false);

create policy activities_update on activities
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and is_preset = false);

create policy activities_delete on activities
  for delete to authenticated
  using (user_id = auth.uid());

-- =========================================================================
-- time_entries
-- =========================================================================
alter table time_entries enable row level security;

create policy time_entries_select on time_entries
  for select to authenticated
  using (user_id = auth.uid());

create policy time_entries_insert on time_entries
  for insert to authenticated
  with check (user_id = auth.uid());

create policy time_entries_update on time_entries
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy time_entries_delete on time_entries
  for delete to authenticated
  using (user_id = auth.uid());

-- =========================================================================
-- ideal_allocations
-- =========================================================================
alter table ideal_allocations enable row level security;

create policy ideal_allocations_select on ideal_allocations
  for select to authenticated using (user_id = auth.uid());
create policy ideal_allocations_insert on ideal_allocations
  for insert to authenticated with check (user_id = auth.uid());
create policy ideal_allocations_update on ideal_allocations
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ideal_allocations_delete on ideal_allocations
  for delete to authenticated using (user_id = auth.uid());

-- =========================================================================
-- notification_preferences
-- =========================================================================
alter table notification_preferences enable row level security;

create policy notification_preferences_select on notification_preferences
  for select to authenticated using (user_id = auth.uid());
create policy notification_preferences_insert on notification_preferences
  for insert to authenticated with check (user_id = auth.uid());
create policy notification_preferences_update on notification_preferences
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notification_preferences_delete on notification_preferences
  for delete to authenticated using (user_id = auth.uid());

-- =========================================================================
-- tags
-- =========================================================================
alter table tags enable row level security;

create policy tags_select on tags
  for select to authenticated using (user_id = auth.uid());
create policy tags_insert on tags
  for insert to authenticated with check (user_id = auth.uid());
create policy tags_update on tags
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tags_delete on tags
  for delete to authenticated using (user_id = auth.uid());

-- =========================================================================
-- user_preferences
-- =========================================================================
alter table user_preferences enable row level security;

create policy user_preferences_select on user_preferences
  for select to authenticated using (user_id = auth.uid());
create policy user_preferences_insert on user_preferences
  for insert to authenticated with check (user_id = auth.uid());
create policy user_preferences_update on user_preferences
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_preferences_delete on user_preferences
  for delete to authenticated using (user_id = auth.uid());

-- =========================================================================
-- entry_tags
-- =========================================================================
-- entry_tags.user_id is set by the entry_tags_set_user_id trigger from the
-- parent time_entries.user_id (and rejected if the tag belongs to a
-- different user). So a flat user_id = auth.uid() check here is sufficient
-- AND prevents cross-user attachment.
alter table entry_tags enable row level security;

create policy entry_tags_select on entry_tags
  for select to authenticated using (user_id = auth.uid());
create policy entry_tags_insert on entry_tags
  for insert to authenticated with check (user_id = auth.uid());
create policy entry_tags_update on entry_tags
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy entry_tags_delete on entry_tags
  for delete to authenticated using (user_id = auth.uid());
