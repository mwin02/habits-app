# Supabase setup (Phase 3 — cloud sync)

This directory holds the Postgres schema, RLS policies, preset seed, and the
PowerSync sync rules for the Habits app's optional cloud sync.

> **Public repo reminder:** never commit a service role key, JWT secret, or
> connection string. Only the **anon key** and **project URL** are safe to
> ship in the client (see the Security section in `CLAUDE.md`).

## One-time setup

1. **Install the CLI** (macOS):
   ```bash
   brew install supabase/tap/supabase
   ```
2. **Create a Supabase project** in the dashboard (free tier is fine for dev).
3. **Link this repo to it:**
   ```bash
   supabase link --project-ref <your-project-ref>
   ```
4. **Push schema + RLS:**
   ```bash
   supabase db push
   ```
   This applies `migrations/0001_initial_schema.sql` then
   `migrations/0002_rls_policies.sql` in order.
5. **Seed presets** (idempotent — safe to re-run):
   ```bash
   supabase db execute --file supabase/seed.sql
   ```
   Or, in the dashboard SQL editor, paste the contents of `seed.sql` and run.

   Verify:
   ```sql
   select count(*) from categories where is_preset;  -- expect 10
   select count(*) from activities where is_preset;  -- expect 41
   ```

## RLS smoke test

Confirm user A cannot see user B's rows. From the SQL editor:

```sql
-- Pretend to be user A
select set_config('request.jwt.claim.sub', '<user-a-uuid>', true);
set local role authenticated;

select count(*) from time_entries;        -- only A's rows
insert into time_entries (user_id, activity_id, started_at, timezone)
values ('<user-b-uuid>', '<some-activity-id>', now(), 'UTC');
-- ^ should fail with RLS violation
```

Repeat for `tags` and `user_preferences`. For `entry_tags`, try to insert a
row pointing to user B's `entry_id` from user A's session — should fail.

## PowerSync Cloud setup

1. Sign up at [powersync.com](https://www.powersync.com) (free tier).
2. **Create the `powersync` publication in Supabase** before adding the
   data source. PowerSync subscribes to a logical-replication publication
   with this exact name; without it, "Test connection" fails with
   `Publication 'powersync' not found`. Run in the Supabase SQL editor:
   ```sql
   create publication powersync for table
     categories,
     activities,
     time_entries,
     ideal_allocations,
     notification_preferences,
     tags,
     entry_tags,
     user_preferences;
   ```
   Verify with `select * from pg_publication_tables where pubname = 'powersync';`
   — expect 8 rows. **Whenever you add a new synced table in a future
   migration, also append it:**
   `alter publication powersync add table <new_table>;` Otherwise PowerSync
   silently misses writes to it (no error — just missing data).
3. **Create instance** and connect to your Supabase project:
   - Choose Supabase as the data source.
   - Paste the Postgres connection string (from Supabase → Project Settings →
     Database). Use the **service role** connection — PowerSync uses logical
     replication and needs broad read access. This connection string lives
     only in PowerSync's dashboard, not in this repo.
4. **Paste sync rules**: copy the contents of `sync-rules.yaml` into the
   PowerSync dashboard's Sync Rules / Sync Streams editor and deploy.
   **The dashboard is the source of truth for what's actually deployed** —
   `sync-rules.yaml` in this repo is just a committed record. They can
   drift; re-paste from the file every time you change it.
5. **Configure JWT auth** in PowerSync → Client Auth. Supabase signs JWTs
   asymmetrically (ECC P-256) by default, so use JWKS:
   - JWKS URI: `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`
   - Audience: `authenticated`
   - Issuer (if asked): `https://<project-ref>.supabase.co/auth/v1`

   No live verification fires until Block 4 hooks up the connector with a
   real signed-in client. PowerSync's Health page will show "All clear" as
   long as Sync Rules + Database Connection are green.
6. **Copy the PowerSync instance URL** — this becomes
   `EXPO_PUBLIC_POWERSYNC_URL` in the app's `.env`.

## Local env wiring (mobile app)

Copy `.env.example` at the repo root to `.env` and fill in:

```
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-dashboard>
EXPO_PUBLIC_POWERSYNC_URL=https://<instance>.powersync.journeyapps.com
```

The app code that consumes these env vars lands in Block 2 (`lib/supabase.ts`)
and Block 4 (`lib/powersync-connector.ts`) — there's nothing to wire on the
client in this block.
