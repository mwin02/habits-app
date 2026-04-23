import { TIMELINE_ENTRIES_QUERY, type TimelineEntryRow } from "@/db/queries";
import {
  getCurrentTimezone,
  getEndOfDay,
  getStartOfDay,
} from "@/lib/timezone";
import { useQuery } from "@powersync/react";
import { useMemo } from "react";
import { getWeekRange } from "./useInsightsData";

export interface DayOfWeekCategory {
  id: string;
  name: string;
  color: string;
}

export interface DayOfWeekSegment {
  category: DayOfWeekCategory;
  seconds: number;
}

export interface DayOfWeekHour {
  hour: number; // 0..23
  dominant: DayOfWeekCategory | null;
  /** Fraction of the hour covered by any tracked entry (0..1). */
  coveredFraction: number;
}

export interface DayOfWeekBucket {
  /** Mon=0 … Sun=6 */
  dayIndex: number;
  totalSeconds: number;
  /** Category segments sorted by seconds desc for stable stacking. */
  segments: DayOfWeekSegment[];
  /** 24 hourly buckets for Timeline mode. */
  hours: DayOfWeekHour[];
}

export interface UseDayOfWeekBreakdownResult {
  /** 7 buckets, Mon..Sun in order */
  days: DayOfWeekBucket[];
  /** Tallest day's total seconds — for normalizing bar heights */
  maxSeconds: number;
  /** Unique categories that appear in the week, ordered by total seconds desc */
  legend: DayOfWeekCategory[];
  isLoading: boolean;
}

const MS_PER_SECOND = 1000;

/**
 * Aggregates entries across a week into 7 Mon–Sun buckets, each stacked by
 * category. Entries that span local midnight are split at the day boundary
 * (in the entry's own timezone) so minutes count against the correct day.
 */
export function useDayOfWeekBreakdown(
  weekDate: string,
): UseDayOfWeekBreakdownResult {
  const timezone = getCurrentTimezone();

  const { weekStartIso, weekEndIso, weekStartDateStr } = useMemo(() => {
    const { weekStart, weekEnd } = getWeekRange(weekDate);
    return {
      weekStartIso: getStartOfDay(weekStart, timezone).toISOString(),
      weekEndIso: getEndOfDay(weekEnd, timezone).toISOString(),
      weekStartDateStr: weekStart,
    };
  }, [weekDate, timezone]);

  const { data: rows, isLoading } = useQuery<TimelineEntryRow>(
    TIMELINE_ENTRIES_QUERY,
    [weekEndIso, weekStartIso],
  );

  const result = useMemo(() => {
    // Map dayIndex → Map<categoryKey, seconds>
    const buckets: Map<string, number>[] = Array.from(
      { length: 7 },
      () => new Map<string, number>(),
    );
    // Map dayIndex → hour 0..23 → Map<categoryKey, seconds>
    const hourBuckets: Map<string, number>[][] = Array.from(
      { length: 7 },
      () =>
        Array.from({ length: 24 }, () => new Map<string, number>()),
    );
    const categoryMeta = new Map<string, DayOfWeekCategory>();
    const categoryTotals = new Map<string, number>();

    const weekStartMs = new Date(weekStartIso).getTime();
    const weekEndMs = new Date(weekEndIso).getTime();
    const nowMs = Date.now();

    for (const row of rows) {
      const rawStartMs = new Date(row.started_at).getTime();
      const rawEndMs = row.ended_at
        ? new Date(row.ended_at).getTime()
        : nowMs;

      const startMs = Math.max(rawStartMs, weekStartMs);
      const endMs = Math.min(rawEndMs, weekEndMs);
      if (endMs <= startMs) continue;

      const catKey = `${row.category_name}|${row.category_color}`;
      categoryMeta.set(catKey, {
        id: catKey,
        name: row.category_name,
        color: row.category_color,
      });

      // Walk day by day in the entry's own timezone, splitting at local
      // midnight so a single entry can contribute to multiple buckets.
      const tz = row.timezone;
      let cursorMs = startMs;
      while (cursorMs < endMs) {
        const localDateStr = localDateInTz(cursorMs, tz);
        const dayEnd = getEndOfDay(localDateStr, tz).getTime();
        const sliceEndMs = Math.min(dayEnd, endMs);
        const seconds = (sliceEndMs - cursorMs) / MS_PER_SECOND;

        const dayIndex = dayIndexFromWeekStart(
          localDateStr,
          weekStartDateStr,
        );
        if (dayIndex >= 0 && dayIndex < 7) {
          const bucket = buckets[dayIndex];
          bucket.set(catKey, (bucket.get(catKey) ?? 0) + seconds);
          categoryTotals.set(
            catKey,
            (categoryTotals.get(catKey) ?? 0) + seconds,
          );

          // Sub-walk the day slice hour-by-hour (in the entry's tz) to
          // populate hourly buckets for Timeline mode.
          let hourCursorMs = cursorMs;
          while (hourCursorMs < sliceEndMs) {
            const localHour = getLocalHour(hourCursorMs, tz);
            const nextHourMs = getNextHourBoundaryMs(hourCursorMs, tz);
            const hourSliceEndMs = Math.min(nextHourMs, sliceEndMs);
            const hourSeconds =
              (hourSliceEndMs - hourCursorMs) / MS_PER_SECOND;
            const hourBucket = hourBuckets[dayIndex][localHour];
            hourBucket.set(
              catKey,
              (hourBucket.get(catKey) ?? 0) + hourSeconds,
            );
            hourCursorMs = hourSliceEndMs;
          }
        }

        cursorMs = sliceEndMs + 1; // +1ms to cross the day boundary
      }
    }

    const days: DayOfWeekBucket[] = buckets.map((bucket, dayIndex) => {
      const segments: DayOfWeekSegment[] = [];
      let totalSeconds = 0;
      for (const [catKey, seconds] of bucket) {
        totalSeconds += seconds;
        const category = categoryMeta.get(catKey);
        if (category) segments.push({ category, seconds });
      }
      segments.sort((a, b) => b.seconds - a.seconds);

      const hours: DayOfWeekHour[] = hourBuckets[dayIndex].map(
        (hourMap, hour) => {
          let dominant: DayOfWeekCategory | null = null;
          let dominantSeconds = 0;
          let hourTotal = 0;
          for (const [catKey, seconds] of hourMap) {
            hourTotal += seconds;
            if (seconds > dominantSeconds) {
              dominantSeconds = seconds;
              dominant = categoryMeta.get(catKey) ?? null;
            }
          }
          return {
            hour,
            dominant,
            coveredFraction: Math.min(1, hourTotal / 3600),
          };
        },
      );

      return { dayIndex, totalSeconds, segments, hours };
    });

    const maxSeconds = days.reduce(
      (max, d) => (d.totalSeconds > max ? d.totalSeconds : max),
      0,
    );

    const legend = Array.from(categoryMeta.values()).sort(
      (a, b) =>
        (categoryTotals.get(b.id) ?? 0) - (categoryTotals.get(a.id) ?? 0),
    );

    return { days, maxSeconds, legend };
  }, [rows, weekStartIso, weekEndIso, weekStartDateStr]);

  return {
    days: result.days,
    maxSeconds: result.maxSeconds,
    legend: result.legend,
    isLoading,
  };
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function localDateInTz(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(
    new Date(ms),
  );
}

function getLocalHour(ms: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  return h === 24 ? 0 : h;
}

function getNextHourBoundaryMs(ms: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const get = (t: string): number =>
    Number(parts.find((p) => p.type === t)?.value ?? 0);
  const msIntoHour = get("minute") * 60_000 + get("second") * 1000;
  return ms + (3_600_000 - msIntoHour);
}

/** Days between two YYYY-MM-DD strings (noon-anchored to avoid DST). */
function dayIndexFromWeekStart(
  localDateStr: string,
  weekStartDateStr: string,
): number {
  const toMs = (s: string): number => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d, 12);
  };
  const diffMs = toMs(localDateStr) - toMs(weekStartDateStr);
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}
