# Supabase / PowerSync backend — design notes

This file captures the *why* behind the schema, RLS, sync rules, and seed
choices in `supabase/`. CLAUDE.md links here from its Phase 3 section.
Update this file when a backend decision changes; treat it as ADR-style
running history rather than as polished documentation.

---

## Architecture in one diagram

```
Mobile app  ──WebSocket──▶  PowerSync Cloud  ──logical replication──▶  Supabase Postgres
            ◀─stream────                      ◀─writes via REST────
                            (sync-rules.yaml)            (RLS enforced)
```

- The client speaks to PowerSync over WebSocket for **downloads** (sync rules
  decide which rows the client receives) and to Supabase REST for **uploads**
  (writes go through PostgREST, RLS gates them).
- Supabase is the source of truth. PowerSync Cloud is a stateful cache /
  router; sync rules only filter what the client sees.

---

## Schema decisions

### Postgres types ↔ PowerSync ↔ SQLite

| `db/schema.ts` (client)         | Postgres (server)          | Notes |
|---------------------------------|----------------------------|-------|
| `column.text`                   | `text` / `timestamptz`     | timestamps stored as ISO strings on the client; PowerSync converts |
| `column.integer` (used as bool) | `boolean`                  | PowerSync converts true/false ↔ 1/0 transparently |
| `column.integer` (real int)     | `integer`                  | 1:1 |
| `column.text` (id)              | `uuid`                     | client treats as opaque string |

We use `BOOLEAN` server-side (not `INTEGER`) because RLS policies and CHECK
constraints read better with `is_preset = true` than `is_preset = 1`. The
client never sees the difference.

### UUID generation

- **Default for column inserts:** `gen_random_uuid()`. It comes from
  Postgres core (≥13) / `pgcrypto` and is in the **`public`** search path
  on Supabase.
- **Deterministic preset IDs:** `extensions.uuid_generate_v5(...)`. The
  function lives in `uuid-ossp`, which Supabase installs into the
  **`extensions`** schema. Always schema-qualify the call — unqualified
  `uuid_generate_v5(...)` fails with `function does not exist (42883)` at
  apply time.

### Preset UUID scheme

```sql
namespace = 'b6c1f4d2-7e9a-5c43-9f0b-2a8e3d6f1c00'::uuid
category_id = uuid_v5(namespace, 'category:' || name)
activity_id = uuid_v5(namespace, 'activity:' || category_name || ':' || activity_name)
```

The namespace is committed-as-config in `supabase/seed.sql`. **Do not change
it** — the client-side claim flow (Block 5) recomputes the same hashes to
remap local preset IDs to server preset IDs. Changing the namespace breaks
that mapping for every device that ever ran the app pre-sync.

The activity key includes the category name so duplicate activity names
across categories (`'Walking'` exists in *Health & Fitness* and *Travel*)
get distinct UUIDs.

### Why `is_preset` + `user_id IS NULL`?

CHECK constraints on `categories` and `activities` enforce the invariant:

```sql
(is_preset = true  and user_id is null)
or (is_preset = false and user_id is not null)
```

This is defense-in-depth on top of RLS — a buggy migration or a misuse of
the service role can't accidentally create a "user-owned preset" or a
"global non-preset" row. Block 5's local-data-claim flow deletes local
preset rows before bulk-claiming user data, so legitimate uploads never
trip the check.

### `daily_summaries` is intentionally absent server-side

It's a derived cache on the client. Adding it server-side would mean
trigger-maintained materialization or per-write recomputation, which
neither user-visible feature today nor the analytics layer needs. Keep it
local; rebuild on demand.

---

## The `time_entries` overlap question (and why we dropped the constraint)

Earlier drafts of this block had:

```sql
-- DO NOT add this back without reading this section.
constraint time_entries_no_overlap exclude using gist (
  user_id with =,
  tstzrange(started_at, coalesce(ended_at, 'infinity'::timestamptz)) with &&
) where (deleted_at is null)
```

We removed it. Three reasons:

1. **The frontend already produces overlaps.** Retroactive entries and
   `updateEntryTimes` paths don't validate against existing rows. PowerSync
   treats constraint failures as **fatal** for the upload queue — a single
   overlapping entry in a user's local DB stalls all subsequent syncs for
   that user. Worst case at the worst time (first sign-in).
2. **It was solving the wrong problem.** It was introduced to handle the
   multi-device running-timer race, but the auto-close trigger (below)
   already does that. The constraint was just a wider net.
3. **It pre-committed against future multi-tasking.** If we ever let users
   track concurrent activities (a real product question, not a hypothetical),
   this constraint would have to come down via migration on a live database.

What we kept instead:

```sql
create unique index time_entries_one_running_per_user
  on time_entries (user_id)
  where ended_at is null and deleted_at is null;
```

This enforces the *actual* invariant — at most one running entry per user —
and doubles as the running-entry lookup index. It allows closed entries to
overlap freely. Data-quality concerns about overlapping closed entries
move to the analytics layer (Insights queries already clip ranges; see
CLAUDE.md "Range aggregations must clip entry durations").

### The auto-close trigger contract

`close_running_entries_for_user` (BEFORE INSERT/UPDATE on `time_entries`):
when the new row has `ended_at IS NULL`, it closes any *other* running
entry for the same user by setting `ended_at = NEW.started_at` and
recomputing `duration_seconds`. The unique partial index above handles the
narrow concurrent-insert race the trigger can miss.

If you ever want **concurrent running entries** (true multi-tasking), drop
both this trigger and the unique index in a single migration. They're
designed to come down together.

---

## `entry_tags`: why `user_id` is denormalized

PowerSync sync-rule **data queries** must be flat single-table SELECTs.
JOINs are only allowed in **parameter** queries. The original plan had:

```yaml
- SELECT et.* FROM entry_tags et
  JOIN time_entries te ON te.id = et.entry_id
  WHERE te.user_id = bucket.user_id
```

…which PowerSync rejects. Instead, `entry_tags` carries a `user_id` column
kept in sync by `entry_tags_set_user_id` (BEFORE INSERT/UPDATE):

- Pulls `user_id` from the parent `time_entries` and overwrites
  `NEW.user_id` with it.
- Verifies the referenced `tag.user_id` matches.
- Raises an explicit error on mismatch — blocks any attempt to attach
  another user's tag to your entry, even via a forged client write.

This means RLS for `entry_tags` is a flat `user_id = auth.uid()` check
(simpler and faster than a correlated EXISTS), and the sync rule is a flat
`SELECT * FROM entry_tags WHERE user_id = bucket.user_id`.

**Heads-up for Block 4:** `db/schema.ts` currently declares `entry_tags`
without `user_id`. When that block flips `localOnly: false`, add
`user_id: column.text` to the local schema definition and update any local
inserts to omit it (server trigger fills it on upload).

---

## RLS contract

| Table | Read | Write |
|---|---|---|
| `categories`, `activities` | `user_id IS NULL` (presets) **OR** `user_id = auth.uid()` | `user_id = auth.uid() AND is_preset = false` (presets are read-only to clients) |
| `time_entries`, `ideal_allocations`, `notification_preferences`, `tags`, `user_preferences` | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `entry_tags` | `user_id = auth.uid()` (denormalized; see above) | `user_id = auth.uid()` (server trigger pre-fills `user_id` from parent entry) |

- All policies are scoped to `to authenticated`. The `anon` role has zero
  policies → zero access. RLS is the only thing standing between user A
  and user B's rows since the anon key ships in the client.
- Service role bypasses RLS; only used for migrations and `seed.sql`.
- Soft-deleted rows (`deleted_at IS NOT NULL`) are still returned by SELECT
  policies; client-side queries filter them out.

---

## Sync rules

Two bucket families in `supabase/sync-rules.yaml`:

- **`global_presets`** (no parameters) — every authed user receives the
  same 10 categories + 41 activities seeded with `user_id IS NULL`.
- **`by_user`** (parameter `request.user_id()`) — all eight user-owned
  tables. `daily_summaries` is excluded (local cache only).

PowerSync sync-rule **limitations and gotchas** worth knowing:

- Data queries are single-table flat selects. No JOINs, no CTEs, no
  subqueries. (Drove the `entry_tags.user_id` denormalization.)
- Parameter queries can JOIN — useful when bucket membership depends on
  cross-table state.
- The bucket name is part of the sync key; renaming a bucket forces every
  client to re-download those rows on next sync. Avoid bucket renames
  post-launch unless you accept the bandwidth.
- **The PowerSync dashboard is the source of truth** for what's deployed.
  `supabase/sync-rules.yaml` in this repo is a committed record, not
  auto-deployed. Re-paste every time you edit the file. The two can drift.
- **Deploying sync rules invalidates affected client buckets** — connected
  clients re-download the changed data on next sync. Negligible
  pre-launch; per-client bandwidth bump after.
- Validation in the PowerSync editor catches syntax (unknown columns, bad
  parameters) but **not** publication membership — referencing a table
  that's not in the `powersync` publication "deploys" cleanly but the
  table never streams. Watch Diagnostics / Logs after each deploy.

---

## Preset-mutation playbook

Since presets sync via the global bucket, changing them post-launch is a
production operation. Difficulty depends on what you're changing:

### 🟢 Free
Anything that doesn't change preset *identity*:
- Rename, recolor, re-icon, reorder (`sort_order`)
- Add a brand-new preset (new v5 hash from a new name → new row)
- Soft-archive a preset (`is_archived = true`)

The seed's `ON CONFLICT (id) DO UPDATE` handles all of these on re-run.
Re-run via `supabase db execute --file supabase/seed.sql`. Every authed
client picks up the change within seconds.

### 🟡 Medium
**Removing a preset** that already has user time entries pointing at it.
You need to either:
- Soft-archive instead (`is_archived = true`, leave `deleted_at = null`)
  so existing entries still resolve their activity, or
- Run a one-off SQL migration that re-points `time_entries.activity_id`
  to a substitute activity, then soft-delete the old one.

### 🔴 Tricky
**Splitting / merging presets** while preserving entry attribution. The
right answer is almost always: add the new presets, archive the old, and
leave existing time entries on the archived activity. Splitting requires
guessing user intent — make it a user-facing operation, not a server-side
one.

### Renames don't change IDs
The v5 hash is computed from the original name in `seed.sql`. Renaming
"Meals" → "Food" updates the row's `name` but its `id` is still
`uuid_v5(namespace, 'category:Meals')`. That's the desired behavior —
existing references survive. If you ever want a clean ID, that's a
delete-and-recreate dance; only worth it for first-time misnames before
launch.

---

## Operational checklist when re-applying schema

`supabase db push` is incremental — it only applies migrations the remote
hasn't seen. If you edit `0001_initial_schema.sql` in place (which is fine
pre-launch), the CLI **won't re-apply** it. Two options:

- **`supabase db reset --linked`** — wipes the remote DB and re-runs all
  migrations from scratch. Cleanest. Destructive on data, but you don't
  have any yet.
- **Manual diff in the SQL editor** — for surgical changes once you do
  have data.

After re-applying, **always re-run the seed** (`supabase db execute --file
supabase/seed.sql`). Migrations don't include it.

Verify:
```sql
select count(*) from categories where is_preset;  -- 10
select count(*) from activities where is_preset;  -- 41
```

### Adding a new synced table

When a future migration adds a synced table (i.e. anything that isn't
`localOnly` on the client), three things must happen together:

1. The migration creates the table with RLS + policies.
2. The table is added to the `powersync` publication:
   ```sql
   alter publication powersync add table <new_table>;
   ```
   Otherwise PowerSync replication won't see writes — silently. No error.
3. `supabase/sync-rules.yaml` gains a `SELECT … WHERE user_id = bucket.user_id`
   line in the `by_user` bucket (or the appropriate bucket), and that
   change is **redeployed via the PowerSync dashboard**. Editing the file
   alone does nothing until you paste it into the editor.

Skipping any one of these results in a silently-broken sync. Treat the
three as an atomic unit when reviewing PRs that add tables.
