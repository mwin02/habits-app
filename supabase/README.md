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
   select count(*) from activities where is_preset;  -- expect 40
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
2. **Create instance** and connect to your Supabase project:
   - Choose Supabase as the data source.
   - Paste the Postgres connection string (from Supabase → Project Settings →
     Database). Use the **service role** connection — PowerSync uses logical
     replication and needs broad read access. This connection string lives
     only in PowerSync's dashboard, not in this repo.
3. **Paste sync rules**: copy the contents of `sync-rules.yaml` into the
   PowerSync dashboard's sync rules editor and deploy.
4. **Configure JWT auth**: point PowerSync at your Supabase project's JWKS
   URL so it can verify Supabase-issued JWTs. The form takes:
   - JWKS URI: `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`
   - Audience: `authenticated`
5. **Copy the PowerSync instance URL** — this becomes
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
