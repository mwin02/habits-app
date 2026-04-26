# Horae

A mobile time-tracking app that helps you see how you actually spend your days — and how that lines up with how you want to.

Named for the **Horae**, the Greek goddesses of the hours, who kept the rhythm of the day.

## Stack

- **React Native + Expo SDK 55** (TypeScript, Expo Router)
- **PowerSync + OP-SQLite** — offline-first local DB, syncs to Supabase (Phase 3)
- **Supabase** — Postgres, Auth, RLS, Edge Functions
- **Zustand** — ephemeral UI state only
- **expo-notifications** — local idle / long-running reminders

## Getting Started

```bash
# Install dependencies
npm install

# Run on iOS simulator (required — PowerSync uses native SQLite via JSI, incompatible with Expo Go)
npx expo run:ios

# Type check
npx tsc --noEmit
```

## Project Layout

```
app/                # Expo Router screens (tabs, modals)
components/         # Reusable UI (timer, timeline, insights, common)
db/                 # PowerSync schema, models, queries, seed
hooks/              # useTimer, useElapsedTime, useInsightsData, etc.
lib/                # PowerSync init, timezone helpers, notifications, uuid
store/              # Zustand UI store
constants/          # Design tokens (theme.ts), preset categories
supabase/           # Migrations, seeds, Edge Functions (Phase 3)
```

## Architecture Notes

- **Offline-first.** All writes go to local SQLite unless Cloud Sync is enabled
- **Timer state = a `time_entries` row with `ended_at = null`.** Elapsed time is always recomputed from `started_at` — never accumulated via `setInterval`.
- **All times stored in UTC** with the entry's IANA timezone alongside. Display in original timezone.
- **Soft deletes only** (`deleted_at`) to preserve sync integrity.
