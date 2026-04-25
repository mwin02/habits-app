import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { RECOMMENDATION_QUERY } from '@/db/queries';
import type { RecommendedActivity } from '@/db/models';
import { getCurrentTimezone } from '@/lib/timezone';

interface FlatRow {
  started_at: string;
  timezone: string;
  activity_id: string;
  activity_name: string;
  category_name: string;
  category_color: string;
}

export interface UseRecommendedActivityResult {
  recommendation: RecommendedActivity | null;
  isLoading: boolean;
}

const HOUR_WINDOW = 1;
const RECENCY_HALF_LIFE_DAYS = 14;
const MIN_QUALIFYING_ENTRIES = 3;
const MS_PER_DAY = 86_400_000;

interface LocalParts {
  hour: number;
  weekday: number;
}

/**
 * Extract local hour (0–23) and weekday (0=Sun..6=Sat) for a UTC instant
 * in the given IANA timezone. Uses Intl.DateTimeFormat.formatToParts so we
 * don't construct intermediate Date objects from formatted strings (Hermes
 * is unreliable parsing locale strings).
 */
function getLocalParts(date: Date, timezone: string): LocalParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const weekdayShort = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '0';
  const hour = Number(hourStr) % 24;

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = weekdayMap[weekdayShort] ?? 0;

  return { hour, weekday };
}

/**
 * Returns true if `entryHour` falls within ±HOUR_WINDOW of `targetHour`,
 * with wrap-around so 23:30 matches a 00:30 target.
 */
function isHourWithinWindow(entryHour: number, targetHour: number): boolean {
  const diff = Math.abs(entryHour - targetHour);
  const wrapped = Math.min(diff, 24 - diff);
  return wrapped <= HOUR_WINDOW;
}

interface Score {
  activityId: string;
  activityName: string;
  categoryName: string;
  categoryColor: string;
  weight: number;
  count: number;
}

/**
 * Reactive hook that recommends a single activity based on the user's
 * historical patterns at the current local hour and weekday. Returns null
 * when there is insufficient history (fewer than MIN_QUALIFYING_ENTRIES
 * matching entries in the last 60 days).
 *
 * Scoring: each matching entry contributes a recency-decayed weight where
 * weight = 1 / (1 + daysAgo / RECENCY_HALF_LIFE_DAYS). The activity with
 * the highest total weight wins.
 */
export function useRecommendedActivity(): UseRecommendedActivityResult {
  const { data, isLoading } = useQuery<FlatRow>(RECOMMENDATION_QUERY);

  const recommendation = useMemo((): RecommendedActivity | null => {
    if (!data || data.length === 0) return null;

    const tz = getCurrentTimezone();
    const now = new Date();
    const target = getLocalParts(now, tz);
    const nowMs = now.getTime();

    const scores = new Map<string, Score>();

    for (const row of data) {
      const startedAt = new Date(row.started_at);
      const startedMs = startedAt.getTime();
      if (Number.isNaN(startedMs)) continue;

      const local = getLocalParts(startedAt, row.timezone || tz);
      if (local.weekday !== target.weekday) continue;
      if (!isHourWithinWindow(local.hour, target.hour)) continue;

      const daysAgo = Math.max(0, (nowMs - startedMs) / MS_PER_DAY);
      const weight = 1 / (1 + daysAgo / RECENCY_HALF_LIFE_DAYS);

      const existing = scores.get(row.activity_id);
      if (existing) {
        existing.weight += weight;
        existing.count += 1;
      } else {
        scores.set(row.activity_id, {
          activityId: row.activity_id,
          activityName: row.activity_name,
          categoryName: row.category_name,
          categoryColor: row.category_color,
          weight,
          count: 1,
        });
      }
    }

    let best: Score | null = null;
    for (const score of scores.values()) {
      if (score.count < MIN_QUALIFYING_ENTRIES) continue;
      if (!best || score.weight > best.weight) {
        best = score;
      }
    }

    if (!best) return null;

    return {
      activityId: best.activityId,
      activityName: best.activityName,
      categoryName: best.categoryName,
      categoryColor: best.categoryColor,
    };
  }, [data]);

  return { recommendation, isLoading };
}
