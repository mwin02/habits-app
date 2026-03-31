import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import {
  TIMELINE_ENTRIES_QUERY,
  type TimelineEntryRow,
} from '@/db/queries';
import type { TimelineEntry, TimelineGap, TimeEntrySource } from '@/db/models';
import {
  getCurrentTimezone,
  getTodayDate,
} from '@/lib/timezone';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type TimelineItem =
  | { type: 'entry'; data: TimelineEntry & { activityId: string; categoryIcon: string | null } }
  | { type: 'gap'; data: TimelineGap };

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
const MIN_GAP_SECONDS = 60;

/** Default axis range when there are no entries */
const DEFAULT_RANGE_START_HOUR = 6; // 6 AM
const DEFAULT_RANGE_END_HOUR = 22;  // 10 PM

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Get minutes since midnight for a Date in a given timezone */
function minutesSinceMidnight(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
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

  // Compute UTC boundaries for the selected local date.
  // We use naive UTC boundaries (date + T00:00:00Z / T23:59:59.999Z) which is
  // correct enough for local-only mode. The query uses overlap logic so entries
  // near midnight boundaries are still captured.
  const { startOfDayUTC, endOfDayUTC } = useMemo(() => {
    return {
      startOfDayUTC: `${selectedDate}T00:00:00.000Z`,
      endOfDayUTC: `${selectedDate}T23:59:59.999Z`,
    };
  }, [selectedDate]);

  // Reactive query — auto-updates when time_entries table changes
  const { data: rows, isLoading } = useQuery<TimelineEntryRow>(
    TIMELINE_ENTRIES_QUERY,
    [endOfDayUTC, startOfDayUTC],
  );

  const result = useMemo(() => {
    const dayStart = new Date(startOfDayUTC);
    const dayEnd = new Date(endOfDayUTC);
    const now = new Date();
    const isToday = selectedDate === getTodayDate(timezone);

    // The effective end of the visible day: now (if today) or end of day
    const effectiveDayEnd = isToday && now < dayEnd ? now : dayEnd;

    // Transform rows into TimelineEntry objects, clamping to day boundaries
    const entries: (TimelineEntry & { activityId: string; categoryIcon: string | null; clampedStart: Date; clampedEnd: Date })[] =
      rows.map((row) => {
        const startedAt = new Date(row.started_at);
        const endedAt = row.ended_at ? new Date(row.ended_at) : (isToday ? now : null);

        const clampedStart = clampDate(startedAt, dayStart, dayEnd);
        const clampedEnd = endedAt
          ? clampDate(endedAt, dayStart, dayEnd)
          : effectiveDayEnd;

        const durationSeconds = row.ended_at
          ? row.duration_seconds
          : Math.round((clampedEnd.getTime() - clampedStart.getTime()) / 1000);

        return {
          id: row.entry_id,
          activityId: row.activity_id,
          activityName: row.activity_name,
          categoryName: row.category_name,
          categoryColor: row.category_color,
          categoryIcon: row.category_icon,
          startedAt: clampedStart,
          endedAt: clampedEnd,
          durationSeconds,
          note: row.note,
          source: row.source as TimeEntrySource,
          clampedStart,
          clampedEnd,
        };
      });

    // Sort by clamped start time
    entries.sort((a, b) => a.clampedStart.getTime() - b.clampedStart.getTime());

    // Build interleaved items list with gaps
    const items: TimelineItem[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Check for gap before this entry
      const prevEnd = i === 0 ? null : entries[i - 1].clampedEnd;
      if (prevEnd && entry.clampedStart.getTime() - prevEnd.getTime() > MIN_GAP_SECONDS * 1000) {
        const gapDuration = Math.round(
          (entry.clampedStart.getTime() - prevEnd.getTime()) / 1000,
        );
        items.push({
          type: 'gap',
          data: {
            startedAt: prevEnd,
            endedAt: entry.clampedStart,
            durationSeconds: gapDuration,
          },
        });
      }

      // Add the entry (strip clamped helper fields)
      const { clampedStart: _cs, clampedEnd: _ce, ...entryData } = entry;
      items.push({ type: 'entry', data: entryData });
    }

    // Compute axis range
    let rangeStartMinutes: number;
    let rangeEndMinutes: number;

    if (entries.length === 0) {
      rangeStartMinutes = DEFAULT_RANGE_START_HOUR * 60;
      rangeEndMinutes = DEFAULT_RANGE_END_HOUR * 60;
    } else {
      const firstStart = minutesSinceMidnight(entries[0].clampedStart, timezone);
      const lastEnd = minutesSinceMidnight(
        entries[entries.length - 1].clampedEnd,
        timezone,
      );

      // Round to hour boundaries with 1h padding
      rangeStartMinutes = Math.max(0, floorToHour(firstStart) - 60);
      rangeEndMinutes = Math.min(24 * 60, ceilToHour(lastEnd) + 60);

      // If today, ensure range extends to at least current time + 1h
      if (isToday) {
        const nowMinutes = minutesSinceMidnight(now, timezone);
        rangeEndMinutes = Math.min(
          24 * 60,
          Math.max(rangeEndMinutes, ceilToHour(nowMinutes) + 60),
        );
      }
    }

    return { items, rangeStartMinutes, rangeEndMinutes };
  }, [rows, startOfDayUTC, endOfDayUTC, selectedDate, timezone]);

  return {
    items: result.items,
    isLoading,
    rangeStartMinutes: result.rangeStartMinutes,
    rangeEndMinutes: result.rangeEndMinutes,
    timezone,
  };
}
