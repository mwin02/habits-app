# Habits App — Claude Code Guide

## Project Overview

A mobile time-tracking app (React Native + Expo, TypeScript) that helps users track how they spend their days and provides insights on time allocation vs personal goals. Offline-first with cloud sync.

Full implementation plan: `/Users/myozawwin/.claude/plans/ethereal-percolating-chipmunk.md`

## Development Workflow

### Feature Development Process
1. Discuss and scope the feature
2. Create a feature branch from `main` (e.g., `feat/home-timer`)
3. Implement the feature
4. User tests on iOS simulator (`npx expo run:ios`)
5. Commit, push, and create a PR
6. User merges the PR, then switch to `main` and pull

### Git Branching Strategy
- **`main`** — stable, only merged PRs
- **Feature branches** — `feat/<feature-name>` for each implementation step
- **PRs for all feature work** — squash merge to keep main history clean
- **Direct commits to main** only for trivial changes (typos, config tweaks)

### Conversation Strategy
- **One conversation per feature** to manage context window size
- Start each conversation with: *"Working on [Phase X, Step Y]: [feature]. Read the plan at /Users/myozawwin/.claude/plans/ethereal-percolating-chipmunk.md for context."*
- CLAUDE.md and the plan file persist across conversations

## Tech Stack

- **Mobile:** React Native + Expo SDK 55 (TypeScript), Expo Router (file-based routing)
- **Offline DB + Sync:** PowerSync with OP-SQLite adapter (SQLite under the hood, syncs with Supabase)
- **Backend/DB:** Supabase (PostgreSQL, Auth, Row-Level Security, Edge Functions)
- **State:** Zustand (ephemeral UI state only — all persistent data lives in PowerSync/SQLite)
- **Notifications:** expo-notifications (local)
- **UUID Generation:** `uuid` package via `@/lib/uuid` (`generateId()` helper)

## Project Structure

```
habits-app/
├── app/                    # Expo Router screens (file-based routing)
│   ├── (tabs)/             # Tab navigator
│   │   ├── index.tsx       # Home/Timer tab
│   │   ├── timeline.tsx    # Day Timeline tab
│   │   ├── insights.tsx    # Insights tab
│   │   └── settings.tsx    # Settings tab
│   └── _layout.tsx         # Root layout (PowerSync provider, DB init, seed)
├── components/             # Reusable UI components
│   ├── timer/              # Timer display, activity picker, quick-switch
│   ├── timeline/           # Timeline blocks, gap filler
│   ├── insights/           # Charts, comparison bars
│   └── common/             # Shared buttons, modals, toasts
├── db/                     # PowerSync database layer
│   ├── schema.ts           # PowerSync table definitions (5 tables, all localOnly)
│   ├── models.ts           # TypeScript types for UI (RunningTimer, TimelineEntry, etc.)
│   ├── queries.ts          # All CRUD operations (categories, activities, time entries)
│   └── seed.ts             # Seeds 10 preset categories + ~40 activities on first launch
├── hooks/                  # Custom React hooks
├── lib/                    # Library initializations
│   ├── powersync.ts        # PowerSync DB instance (OPSqliteOpenFactory, local-only mode)
│   └── uuid.ts             # generateId() — React Native-safe UUID generation
├── store/                  # Zustand stores (UI state only)
├── constants/              # Preset data, colors, config
│   └── presets.ts          # 10 preset categories with activities
├── supabase/               # Supabase migrations, seed data, Edge Functions (Phase 3)
├── babel.config.js         # Includes async generator plugin for PowerSync watched queries
└── app.json                # Expo configuration
```

## Key Architecture Decisions

1. **Offline-first:** All writes go to local SQLite via PowerSync. Sync to Supabase happens in background when online.
2. **No separate backend:** Supabase handles everything (REST API, Auth, Edge Functions). No Next.js.
3. **Deferred auth:** App is fully usable without an account. Auth is optional for sync/backup.
4. **Timer state:** The running timer is a `time_entries` row with `ended_at = null` in PowerSync. Elapsed time is always computed as `now - started_at` (never accumulated via setInterval).
5. **Timezones:** All times stored in UTC as ISO 8601 strings. Each time_entry stores its IANA timezone at creation. Display in original timezone.
6. **PowerSync OP-SQLite adapter:** Must use `OPSqliteOpenFactory` explicitly — the default adapter (`@journeyapps/react-native-quick-sqlite`) is not installed.

## Data Model (Core Tables)

- **categories** — Work, Sleep, Health, etc. Has `sort_order`, `is_archived`, `is_preset`
- **activities** — Belongs to a category. E.g., "Deep Work" under "Work"
- **time_entries** — Core data. `started_at`, `ended_at`, `duration_seconds`, `timezone`, `note`, `source` (timer/manual/retroactive/import)
- **ideal_allocations** — User's target minutes per day per category
- **daily_summaries** — Pre-aggregated daily totals (computed, not user-edited)

All tables have `updated_at`, `deleted_at` (soft delete) columns. All tables are `localOnly: true` until Phase 3 (sync).

## Development Commands

```bash
# Run on iOS simulator (REQUIRED — Expo Go won't work with PowerSync/JSI)
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Type check
npx tsc --noEmit

# Start Metro bundler separately (if needed)
npx expo start --clear
```

## Coding Conventions

- **TypeScript strict mode** — no `any` types, explicit return types on exported functions
- **Functional components** with hooks — no class components
- **File naming:** kebab-case for files (`activity-picker.tsx`), PascalCase for components (`ActivityPicker`)
- **Imports:** Use path aliases (`@/components/...`, `@/db/...`, `@/hooks/...`)
- **Styling:** StyleSheet.create() — no inline styles except for dynamic values
- **Error handling:** Always handle loading/error/empty states in UI components
- **Database queries:** All PowerSync queries go through `db/queries.ts` — screens never write raw SQL
- **UUID generation:** Always use `generateId()` from `@/lib/uuid` — `crypto.randomUUID()` is not available in React Native
- **PowerSync React hooks:** Use `useQuery` from `@powersync/react` for reactive queries that auto-update on data changes

## Common Patterns

### Starting/stopping timer
```typescript
// Always use the useTimer hook — never manipulate time_entries directly from screens
const { startActivity, stopActivity, switchActivity, runningEntry } = useTimer();
```

### Quick-switch
One tap stops current activity and starts new one. No confirmation modal. Show toast.

### Forgotten stop detection
On app foreground, check for `time_entries` where `ended_at IS NULL`. If found and stale (>2h or different day), show bottom sheet.

### Reactive queries
```typescript
import { useQuery } from '@powersync/react';
// Auto-updates when the categories table changes
const { data: categories, isLoading } = useQuery('SELECT * FROM categories WHERE ...');
```

## Important Constraints

- **`npx expo run:ios` required** — PowerSync uses native SQLite (JSI), incompatible with Expo Go
- **Never use setInterval to accumulate timer duration** — always compute from `started_at`
- **All times in UTC** in the database, display in entry's original timezone
- **Soft deletes only** — use `deleted_at` column, never hard delete (needed for future sync)
- **Zustand for UI state only** — all persistent data goes through PowerSync
- **No `crypto.randomUUID()`** — use `generateId()` from `@/lib/uuid` instead
- **PowerSync `OPSqliteOpenFactory`** — must be passed explicitly when creating the database instance
