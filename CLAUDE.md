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
- Start each conversation with: _"Working on [Phase X, Step Y]: [feature]. Read the plan at /Users/myozawwin/.claude/plans/ethereal-percolating-chipmunk.md for context."_
- CLAUDE.md and the plan file persist across conversations

## Tech Stack

- **Mobile:** React Native + Expo SDK 55 (TypeScript), Expo Router (file-based routing)
- **Offline DB + Sync:** PowerSync with OP-SQLite adapter (SQLite under the hood, syncs with Supabase)
- **Backend/DB:** Supabase (PostgreSQL, Auth, Row-Level Security, Edge Functions)
- **State:** Zustand (ephemeral UI state only — all persistent data lives in PowerSync/SQLite)
- **Notifications:** expo-notifications (local)
- **UUID Generation:** `uuid` package via `@/lib/uuid` (`generateId()` helper)
- **Fonts:** Manrope (headlines/display) + Plus Jakarta Sans (labels/body) via `@expo-google-fonts`
- **Icons:** Feather icons from `@expo/vector-icons` (thin-stroke style)
- **Gradients/Blur:** `expo-linear-gradient`, `expo-blur`
- **SVG:** `react-native-svg` (used for donut charts in Insights tab)

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
│   ├── useTimer.ts         # Core timer hook (start/stop/switch via PowerSync useQuery)
│   ├── useElapsedTime.ts   # Live-ticking elapsed seconds (recalculates from startedAt)
│   ├── useForgottenTimer.ts # Detects stale timers on app foreground (>2h or different day)
│   ├── useCategoriesWithActivities.ts # Reactive grouped categories + activities
│   ├── useInsightsData.ts  # Aggregated insights (category breakdown, coverage, actual vs ideal)
│   └── useActivityBreakdown.ts # Activity-level drill-down within a category
├── lib/                    # Library initializations
│   ├── powersync.ts        # PowerSync DB instance (OPSqliteOpenFactory, local-only mode)
│   ├── timezone.ts         # IANA timezone helpers (format, isToday, duration display)
│   └── uuid.ts             # generateId() — React Native-safe UUID generation
├── store/                  # Zustand stores (UI state only)
│   └── uiStore.ts          # Selected date, ephemeral UI state
├── constants/              # Preset data, colors, config
│   ├── theme.ts            # Design system: COLORS, FONTS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS
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
- **Styling:** StyleSheet.create() — no inline styles except for dynamic values. Use `COLORS`, `TYPOGRAPHY`, `SPACING`, `RADIUS` from `@/constants/theme`
- **Design system:** "Fluid Chronometer" — no borders for sectioning (use background color shifts), tonal depth over structural lines. Designs in `design/` folder
- **Error handling:** Always handle loading/error/empty states in UI components
- **Database queries:** All PowerSync queries go through `db/queries.ts` — screens never write raw SQL
- **UUID generation:** Always use `generateId()` from `@/lib/uuid` — `crypto.randomUUID()` is not available in React Native
- **PowerSync React hooks:** Use `useQuery` from `@powersync/react` for reactive queries that auto-update on data changes

## Common Patterns

### Quick-switch

One tap stops current activity and starts new one. No confirmation modal. Show toast.

### Forgotten stop detection

On app foreground, check for `time_entries` where `ended_at IS NULL`. If found and stale (>2h or different day), show bottom sheet.

### Reusable UI Components (`components/common/`)

- **`GlassCard`** — Glassmorphism card wrapper (BlurView on iOS, rgba fallback on Android)
- **`GradientButton`** — Primary CTA with linear gradient. `shape="pill"` for text buttons, `shape="circle"` for icon buttons (e.g., stop button). **Note:** pill shape has `paddingVertical: 16` making it ~54px tall — if you need exact height control (e.g., fixed-height action rows), use inline `LinearGradient` + `Pressable` instead.
- **`CategoryChip`** — Colored pill showing category name with dot indicator. Does NOT accept a `selected` prop — wrap in a styled `Pressable` with a border for selection state.
- **`CategoryIcon`** — Maps preset icon strings (e.g., `'briefcase'`, `'heart'`) to Feather icons with fallbacks
- **`PulsingDots`** — Animated dots indicator for active timer state
- **`DonutChart`** (`components/insights/donut-chart.tsx`) — Reusable SVG donut chart. Props: `slices` (value + color), `size`, `strokeWidth`, `centerLabel`, `centerSubLabel`. Handles single-slice and empty states.

### Reusable Hooks

- **`useCategoriesWithActivities()`** — Returns `{ categories }` with each category containing its activities array. Used in any activity picker (NewSessionModal, GapFillModal, etc.)
- **`useTimelineData(selectedDate)`** — Returns entries + gaps for a day. Useful reference for timezone-aware day boundary queries.
- **`useTimer()`** — Core timer hook (start/stop/switch)
- **`useElapsedTime(startedAt)`** — Live-ticking seconds from a start time
- **`useForgottenTimer()`** — Detects stale timers on app foreground
- **`useInsightsData(selectedDate, period)`** — Returns `categoryInsights[]`, `coverage`, `totalTrackedMinutes` for daily/weekly periods. Joins category aggregations with ideal allocations.
- **`useActivityBreakdown(categoryId, categoryColor, selectedDate, period)`** — Returns activity-level time slices within a category, with tonal color variations derived from the parent category color.

### Available Query Functions (`db/queries.ts`)

- **`createRetroactiveEntry({ activityId, startedAt, endedAt, timezone })`** — Creates a completed entry with `source: 'retroactive'`
- **`updateEntryTimes(entryId, startedAt, endedAt)`** — Updates start/end times and recomputes `duration_seconds`
- **`updateEntryNote(entryId, note)`** — Updates the note on an entry
- **`deleteEntry(entryId)`** — Soft deletes an entry (sets `deleted_at`)

### Timezone Patterns

**Critical:** All times are stored in UTC. Each `time_entry` stores an IANA timezone. Always display in the entry's original timezone.

**Gotcha:** Never add local minutes to UTC dates directly — use `localMinutesToDate()` from `useTimelineData.ts` which accounts for timezone offset.

**Key timezone helpers in `lib/timezone.ts`:**

- `getCurrentTimezone()` — Returns current IANA timezone string
- `getTodayDate(timezone)` — Returns `YYYY-MM-DD` for today in the given timezone
- `formatTimeInTimezone(isoString, timezone)` — Formats time for display (e.g., "9:30 AM")
- `formatDuration(seconds)` — Human-readable duration (e.g., "1h 30m")
- `minutesSinceMidnight(date, timezone)` — Minutes since midnight for a Date in a timezone (in `useTimelineData.ts`)

**Day boundary queries:** Use naive UTC boundaries (`${date}T00:00:00.000Z` / `T23:59:59.999Z`) as query params with overlap logic (`started_at <= dayEnd AND (ended_at IS NULL OR ended_at >= dayStart)`). This captures entries near midnight even with timezone offsets.

## Implementation Progress

### Completed

- **Phase 1, Step 1:** Expo scaffold with tabs template, EAS dev build configured
- **Phase 1, Step 2:** PowerSync database layer (schema, models, queries, seed)
- **Timer hooks:** useTimer, useElapsedTime, useForgottenTimer, timezone utils, Zustand UI store
- **Phase 1, Step 3:** Home/Timer tab — TimerCard (active/idle with consistent height), QuickSwitchSection (horizontal carousel), NewSessionModal (category filter, search, activity picker), tab layout with Feather icons
- **Phase 1, Step 4:** Forgotten stop modal (bottom sheet with time picker)
- **Phase 2, Step 5:** Timeline tab — vertical day timeline with time axis, entry blocks, gap blocks, clustering of short entries, overlap detection (side-by-side layout), current time indicator, date navigation (DateHeader + WeekStrip), EntryDetailModal (time editing + delete), GapFillModal (activity picker with adjustable times)

- **Phase 2, Step 6:** Insights tab — Daily/Weekly toggle, category breakdown bars, actual vs ideal comparison, activity breakdown with SVG donut chart and category selector, tracking coverage card

### Next Up

- **Phase 3:** Cloud sync (Supabase Auth, PowerSync sync, Row-Level Security)

## Important Constraints

- **`npx expo run:ios` required** — PowerSync uses native SQLite (JSI), incompatible with Expo Go
- **Never use setInterval to accumulate timer duration** — always compute from `started_at`
- **All times in UTC** in the database, display in entry's original timezone
- **Soft deletes only** — use `deleted_at` column, never hard delete (needed for future sync)
- **Zustand for UI state only** — all persistent data goes through PowerSync
- **No `crypto.randomUUID()`** — use `generateId()` from `@/lib/uuid` instead
- **PowerSync `OPSqliteOpenFactory`** — must be passed explicitly when creating the database instance
