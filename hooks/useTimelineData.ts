import type { TimeEntrySource, TimelineEntry, TimelineGap } from "@/db/models";
import { TIMELINE_ENTRIES_QUERY, type TimelineEntryRow } from "@/db/queries";
import {
  getCurrentTimezone,
  getEndOfDay,
  getStartOfDay,
  getTodayDate,
} from "@/lib/timezone";
import { useQuery } from "@powersync/react";
import { useMemo } from "react";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

/** An entry with extra fields for timeline display */
export type TimelineEntryData = TimelineEntry & {
  activityId: string;
  categoryIcon: string | null;
};

/** A cluster of consecutive short entries */
export interface TimelineCluster {
  entries: TimelineEntryData[];
  startedAt: Date;
  endedAt: Date;
  totalDurationSeconds: number;
}

export type TimelineItem =
  | { type: "entry"; data: TimelineEntryData }
  | { type: "gap"; data: TimelineGap }
  | { type: "cluster"; data: TimelineCluster };

export interface UseTimelineDataResult {
  /** Sorted items (entries + gaps) for the selected day */
  items: TimelineItem[];
  /** True while the initial query is loading */
  isLoading: boolean;
  /** Minutes-since-midnight for the first hour label on the time axis */
  rangeStartMinutes: number;
  /** Minutes-since-midnight for the last hour label on the time axis */
  rangeEndMinutes: number;
  /** The timezone used for display */
  timezone: string;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

/** Minimum gap duration (in seconds) to show as an "Untracked" block */
const MIN_GAP_SECONDS = 30 * 60; // 30 minutes

/**
 * Entries shorter than this (in seconds) are candidates for clustering.
 * Tuned to match the canvas's MIN_BLOCK_HEIGHT (40px @ 1.33px/min ≈ 30min):
 * anything below this gets padded up visually, breaking hour-label alignment
 * when several stack consecutively — so we catch them at the source.
 */
const SHORT_ENTRY_THRESHOLD_SECONDS = 30 * 60; // 30 minutes

/** Minimum number of consecutive short entries to form a cluster */
const MIN_CLUSTER_SIZE = 2;

/** Default axis range when there are no entries */
const DEFAULT_RANGE_START_HOUR = 6; // 6 AM
const DEFAULT_RANGE_END_HOUR = 22; // 10 PM

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Get minutes since midnight for a Date in a given timezone */
export function minutesSinceMidnight(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10,
  );
  // Intl may return hour 24 for midnight — treat as 0
  return (hour === 24 ? 0 : hour) * 60 + minute;
}

/** Clamp a date to within [dayStart, dayEnd] */
function clampDate(date: Date, dayStart: Date, dayEnd: Date): Date {
  if (date < dayStart) return dayStart;
  if (date > dayEnd) return dayEnd;
  return date;
}

/** Round minutes down to the nearest hour */
function floorToHour(minutes: number): number {
  return Math.floor(minutes / 60) * 60;
}

/** Round minutes up to the nearest hour */
function ceilToHour(minutes: number): number {
  return Math.ceil(minutes / 60) * 60;
}

/**
 * Convert local minutes-since-midnight to a UTC Date for a given day.
 *
 * `dayStartUTC` is the naive UTC midnight (e.g., `2026-04-01T00:00:00Z`).
 * We compute the timezone offset by checking what local time `dayStartUTC`
 * represents, then subtract that offset to map local minutes → UTC.
 */
function localMinutesToDate(
  localMinutes: number,
  dayStartUTC: Date,
  timezone: string,
): Date {
  const utcMidnightAsLocalMinutes = minutesSinceMidnight(dayStartUTC, timezone);
  return new Date(
    dayStartUTC.getTime() + (localMinutes - utcMidnightAsLocalMinutes) * 60_000,
  );
}

// ──────────────────────────────────────────────
// Clustering
// ──────────────────────────────────────────────

/**
 * Groups consecutive short entries into cluster items.
 * Gaps and long entries pass through unchanged.
 * A "short" entry is one with duration < SHORT_ENTRY_THRESHOLD_SECONDS.
 */
function clusterShortEntries(items: TimelineItem[]): TimelineItem[] {
  const result: TimelineItem[] = [];
  let pendingShort: TimelineEntryData[] = [];

  const flushPending = (): void => {
    if (pendingShort.length >= MIN_CLUSTER_SIZE) {
      const first = pendingShort[0];
      const last = pendingShort[pendingShort.length - 1];
      const totalDuration = pendingShort.reduce(
        (sum, e) => sum + (e.durationSeconds ?? 0),
        0,
      );
      result.push({
        type: "cluster",
        data: {
          entries: pendingShort,
          startedAt: first.startedAt,
          endedAt: last.endedAt ?? last.startedAt,
          totalDurationSeconds: totalDuration,
        },
      });
    } else {
      // Not enough to cluster — emit individually
      for (const entry of pendingShort) {
        result.push({ type: "entry", data: entry });
      }
    }
    pendingShort = [];
  };

  for (const item of items) {
    if (item.type === "entry") {
      // Running entries always render individually so they can live-grow
      // and stay anchored to the "now" indicator.
      if (item.data.isRunning) {
        flushPending();
        result.push(item);
        continue;
      }
      const duration = item.data.durationSeconds ?? 0;
      if (duration < SHORT_ENTRY_THRESHOLD_SECONDS) {
        pendingShort.push(item.data);
        continue;
      }
      // Long entry — flush any pending short entries first
      flushPending();
      result.push(item);
    } else {
      // Gap — flush pending, then pass through
      flushPending();
      result.push(item);
    }
  }
  flushPending();

  return result;
}

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

/**
 * Fetches timeline entries for a given date, computes gaps between them,
 * and returns a sorted list of TimelineItems with axis range metadata.
 *
 * @param selectedDate — YYYY-MM-DD string (from useUIStore)
 */
export function useTimelineData(selectedDate: string): UseTimelineDataResult {
  const timezone = getCurrentTimezone();

  // Compute true local-midnight boundaries for the selected date so entries
  // spanning midnight are clamped to the user's local day, not to UTC midnight.
  const { dayStart, dayEnd } = useMemo(() => {
    return {
      dayStart: getStartOfDay(selectedDate, timezone),
      dayEnd: getEndOfDay(selectedDate, timezone),
    };
  }, [selectedDate, timezone]);

  // Reactive query — auto-updates when time_entries table changes
  const { data: rows, isLoading } = useQuery<TimelineEntryRow>(
    TIMELINE_ENTRIES_QUERY,
    [dayEnd.toISOString(), dayStart.toISOString()],
  );

  const result = useMemo(() => {
    const now = new Date();
    const isToday = selectedDate === getTodayDate(timezone);

    // The effective end of the visible day: now (if today) or end of day
    const effectiveDayEnd = isToday && now < dayEnd ? now : dayEnd;

    // Transform rows into TimelineEntry objects, clamping to day boundaries
    const entries: (TimelineEntry & {
      activityId: string;
      categoryIcon: string | null;
      clampedStart: Date;
      clampedEnd: Date;
    })[] = rows.map((row) => {
      const startedAt = new Date(row.started_at);
      const isRunning = row.ended_at === null && isToday;
      // Real end time from DB (or null for running entries). We keep this null
      // on the returned entry so the canvas can drive live positioning from a
      // single ticking "now". `effectiveEnd` is used only for internal sort,
      // clamping, gap detection, and duration computation.
      const realEndedAt = row.ended_at ? new Date(row.ended_at) : null;
      const effectiveEnd = realEndedAt ?? (isToday ? now : null);

      const clampedStart = clampDate(startedAt, dayStart, dayEnd);
      const clampedEnd = effectiveEnd
        ? clampDate(effectiveEnd, dayStart, dayEnd)
        : effectiveDayEnd;

      const durationSeconds = row.ended_at
        ? row.duration_seconds
        : Math.round((clampedEnd.getTime() - clampedStart.getTime()) / 1000);

      // The real moment the entry occupies up to (finish time or "now" for
      // running entries). Used to detect cross-midnight clipping regardless
      // of whether the running entry belongs to a different local day.
      const realOrNow = realEndedAt ?? now;
      const continuesBefore = startedAt < dayStart;
      const continuesAfter = realOrNow > dayEnd;

      return {
        id: row.entry_id,
        activityId: row.activity_id,
        activityName: row.activity_name,
        categoryName: row.category_name,
        categoryColor: row.category_color,
        categoryIcon: row.category_icon,
        startedAt: clampedStart,
        endedAt: isRunning ? null : clampedEnd,
        isRunning,
        durationSeconds,
        note: row.note,
        source: row.source as TimeEntrySource,
        timezone: row.timezone,
        continuesBefore,
        continuesAfter,
        clampedStart,
        clampedEnd,
      };
    });

    // Sort by clamped start time
    entries.sort((a, b) => a.clampedStart.getTime() - b.clampedStart.getTime());

    // Fixed axis range: always 6 AM – midnight (or current time + 1h for today)
    // Expand if entries fall outside this range
    let rangeStartMinutes = DEFAULT_RANGE_START_HOUR * 60; // 6 AM
    let rangeEndMinutes: number;

    if (isToday) {
      const nowMinutes = minutesSinceMidnight(now, timezone);
      rangeEndMinutes = Math.min(24 * 60, ceilToHour(nowMinutes) + 60);
    } else {
      rangeEndMinutes = 24 * 60; // midnight
    }

    // If entries exist outside the default range, expand to include them
    if (entries.length > 0) {
      const firstStart = minutesSinceMidnight(
        entries[0].clampedStart,
        timezone,
      );
      const lastEnd = minutesSinceMidnight(
        entries[entries.length - 1].clampedEnd,
        timezone,
      );
      rangeStartMinutes = Math.min(
        rangeStartMinutes,
        Math.max(0, floorToHour(firstStart) - 60),
      );
      rangeEndMinutes = Math.max(
        rangeEndMinutes,
        Math.min(24 * 60, ceilToHour(lastEnd) + 60),
      );
    }

    // Compute gap boundary dates using timezone-aware conversion
    const gapRangeStart = localMinutesToDate(
      rangeStartMinutes,
      dayStart,
      timezone,
    );
    // End of gap range: midnight local (24*60 = 1440 min) or current time for today
    const midnightLocal = localMinutesToDate(24 * 60 - 1, dayStart, timezone);
    const gapRangeEnd = isToday
      ? effectiveDayEnd < midnightLocal
        ? effectiveDayEnd
        : midnightLocal
      : midnightLocal;

    // Build interleaved items list with gaps (including leading/trailing)
    const items: TimelineItem[] = [];

    /** Helper to push a gap if duration is significant */
    const pushGap = (start: Date, end: Date): void => {
      // Clamp end to local midnight — don't go past the selected day
      const cappedEnd = end > midnightLocal ? midnightLocal : end;
      if (cappedEnd <= start) return;
      const dur = Math.round((cappedEnd.getTime() - start.getTime()) / 1000);
      if (dur > MIN_GAP_SECONDS) {
        items.push({
          type: "gap",
          data: { startedAt: start, endedAt: cappedEnd, durationSeconds: dur },
        });
      }
    };

    if (entries.length === 0) {
      // No entries — single gap covering the visible range
      pushGap(gapRangeStart, gapRangeEnd);
    } else {
      // Leading gap: from range start to first entry
      pushGap(gapRangeStart, entries[0].clampedStart);

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];

        // Gap between previous entry and this one
        if (i > 0) {
          pushGap(entries[i - 1].clampedEnd, entry.clampedStart);
        }

        // Add the entry (strip clamped helper fields)
        const { clampedStart: _cs, clampedEnd: _ce, ...entryData } = entry;
        items.push({ type: "entry", data: entryData });
      }

      // Trailing gap: from last entry to range end (clamped to midnight)
      pushGap(entries[entries.length - 1].clampedEnd, gapRangeEnd);
    }

    // Cluster consecutive short entries to prevent overlap
    const clusteredItems = clusterShortEntries(items);

    return { items: clusteredItems, rangeStartMinutes, rangeEndMinutes };
  }, [rows, dayStart, dayEnd, selectedDate, timezone]);

  return {
    items: result.items,
    isLoading,
    rangeStartMinutes: result.rangeStartMinutes,
    rangeEndMinutes: result.rangeEndMinutes,
    timezone,
  };
}
