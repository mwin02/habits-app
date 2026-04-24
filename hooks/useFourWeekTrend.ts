import { TIMELINE_ENTRIES_QUERY, type TimelineEntryRow } from "@/db/queries";
import { getCurrentTimezone, getEndOfDay, getStartOfDay } from "@/lib/timezone";
import { useQuery } from "@powersync/react";
import { useMemo } from "react";
import { getMonthRange, getWeekRange } from "./useInsightsData";

export interface TrendCategory {
  id: string;
  name: string;
  color: string;
}

export interface TrendBucket {
  /** 1-indexed label e.g. "W1" */
  label: string;
  /** YYYY-MM-DD of the bucket's local start date (clipped to month) */
  startDate: string;
  /** YYYY-MM-DD of the bucket's local end date (clipped to month) */
  endDate: string;
}

export interface CategoryTrend {
  category: TrendCategory;
  /** Parallel to `buckets`: seconds tracked in each bucket. */
  values: number[];
  /** Sum across all buckets — used for ranking. */
  totalSeconds: number;
}

export interface UseFourWeekTrendResult {
  buckets: TrendBucket[];
  categories: CategoryTrend[];
  /** Largest per-bucket value across all returned categories — for Y scaling. */
  maxBucketSeconds: number;
  isLoading: boolean;
}

const MS_PER_SECOND = 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TOP_CATEGORY_LIMIT = 6;

/**
 * Splits the calendar month into Mon–Sun ISO-week buckets (clipped to the
 * month's first/last day). For each of the top categories (by monthly total),
 * returns a parallel array of per-bucket seconds. Midnight-spanning entries
 * are split at local day boundaries in the entry's own timezone.
 */
export function useFourWeekTrend(
  monthDate: string,
  limit: number = TOP_CATEGORY_LIMIT,
): UseFourWeekTrendResult {
  const timezone = getCurrentTimezone();

  const { startIso, endIso, buckets, monthStart, monthEnd } = useMemo(() => {
    const { monthStart, monthEnd } = getMonthRange(monthDate);
    const startIso = getStartOfDay(monthStart, timezone).toISOString();
    const endIso = getEndOfDay(monthEnd, timezone).toISOString();

    const buckets: TrendBucket[] = [];
    let cursor = monthStart;
    let idx = 1;
    // Clamp safety: at most 6 ISO-week overlaps (month can span 4-6 weeks).
    while (cursor <= monthEnd && buckets.length < 6) {
      const { weekEnd } = getWeekRange(cursor);
      const bucketStart = cursor;
      const bucketEnd = weekEnd > monthEnd ? monthEnd : weekEnd;
      buckets.push({
        label: `W${idx}`,
        startDate: bucketStart,
        endDate: bucketEnd,
      });
      idx += 1;
      cursor = shiftDate(bucketEnd, 1);
    }

    return { startIso, endIso, buckets, monthStart, monthEnd };
  }, [monthDate, timezone]);

  const { data: rows, isLoading } = useQuery<TimelineEntryRow>(
    TIMELINE_ENTRIES_QUERY,
    [endIso, startIso],
  );

  const result = useMemo(() => {
    // Precompute bucket boundaries in ms for quick day→bucket lookup.
    // localDateStr comparison (YYYY-MM-DD) works correctly because buckets
    // are contiguous and non-overlapping within the month.
    const bucketBoundaries = buckets.map((b) => ({
      startMs: getStartOfDay(b.startDate, timezone).getTime(),
      endMs: getEndOfDay(b.endDate, timezone).getTime(),
    }));

    const monthStartMs = getStartOfDay(monthStart, timezone).getTime();
    const monthEndMs = getEndOfDay(monthEnd, timezone).getTime();
    const nowMs = Date.now();

    // Map<categoryKey, { meta, perBucket: number[] }>
    const byCategory = new Map<
      string,
      { meta: TrendCategory; perBucket: number[]; total: number }
    >();

    for (const row of rows) {
      const rawStartMs = new Date(row.started_at).getTime();
      const rawEndMs = row.ended_at
        ? new Date(row.ended_at).getTime()
        : nowMs;

      const startMs = Math.max(rawStartMs, monthStartMs);
      const endMs = Math.min(rawEndMs, monthEndMs);
      if (endMs <= startMs) continue;

      const catKey = `${row.category_name}|${row.category_color}`;
      let entry = byCategory.get(catKey);
      if (!entry) {
        entry = {
          meta: {
            id: catKey,
            name: row.category_name,
            color: row.category_color,
          },
          perBucket: Array(buckets.length).fill(0),
          total: 0,
        };
        byCategory.set(catKey, entry);
      }

      // Walk day-by-day in entry's own tz, splitting at local midnight so
      // week-boundary and day-boundary attribution stays correct.
      const tz = row.timezone;
      let cursorMs = startMs;
      while (cursorMs < endMs) {
        const localDateStr = localDateInTz(cursorMs, tz);
        const dayEndMs = getEndOfDay(localDateStr, tz).getTime();
        const sliceEndMs = Math.min(dayEndMs, endMs);

        const bucketIdx = findBucketIndex(bucketBoundaries, cursorMs);
        if (bucketIdx >= 0) {
          const seconds = (sliceEndMs - cursorMs) / MS_PER_SECOND;
          entry.perBucket[bucketIdx] += seconds;
          entry.total += seconds;
        }

        cursorMs = sliceEndMs + 1;
      }
    }

    const ranked: CategoryTrend[] = Array.from(byCategory.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map(({ meta, perBucket, total }) => ({
        category: meta,
        values: perBucket,
        totalSeconds: total,
      }));

    let maxBucketSeconds = 0;
    for (const cat of ranked) {
      for (const v of cat.values) {
        if (v > maxBucketSeconds) maxBucketSeconds = v;
      }
    }

    return { categories: ranked, maxBucketSeconds };
  }, [rows, buckets, timezone, monthStart, monthEnd, limit]);

  return {
    buckets,
    categories: result.categories,
    maxBucketSeconds: result.maxBucketSeconds,
    isLoading,
  };
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function shiftDate(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d, 12) + deltaDays * MS_PER_DAY;
  return new Date(ms).toISOString().slice(0, 10);
}

function localDateInTz(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(
    new Date(ms),
  );
}

function findBucketIndex(
  boundaries: { startMs: number; endMs: number }[],
  ms: number,
): number {
  for (let i = 0; i < boundaries.length; i += 1) {
    if (ms >= boundaries[i].startMs && ms <= boundaries[i].endMs) return i;
  }
  return -1;
}
