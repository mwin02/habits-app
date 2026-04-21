import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import {
  INSIGHTS_ACTIVITY_QUERY,
  type InsightsActivityRow,
} from '@/db/queries';
import { getCurrentTimezone, getEndOfDay, getStartOfDay } from '@/lib/timezone';
import type { InsightsPeriod } from './useInsightsData';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface ActivitySlice {
  activityId: string;
  activityName: string;
  totalSeconds: number;
  totalMinutes: number;
  percentage: number;
  /** Color derived from the parent category color with tonal variation */
  color: string;
}

export interface UseActivityBreakdownResult {
  activities: ActivitySlice[];
  totalSeconds: number;
  isLoading: boolean;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Get the Monday (start) and Sunday (end) of the week containing the given date.
 */
function getWeekRange(dateStr: string): { weekStart: string; weekEnd: string } {
  const date = new Date(`${dateStr}T12:00:00.000Z`);
  const day = date.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const fmt = (d: Date): string => d.toISOString().slice(0, 10);
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) };
}

/** Opacity steps for generating tonal color variations */
const OPACITY_STEPS = [1.0, 0.75, 0.55, 0.40, 0.30];

/**
 * Parse a hex color string to RGB components.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r, g, b };
}

/**
 * Generate a tonal color variation from a base hex color at a given opacity,
 * blended against white to produce a solid hex color.
 */
function tonalVariation(baseHex: string, opacity: number): string {
  const { r, g, b } = hexToRgb(baseHex);
  // Blend with white (255, 255, 255) at the given opacity
  const blendR = Math.round(r * opacity + 255 * (1 - opacity));
  const blendG = Math.round(g * opacity + 255 * (1 - opacity));
  const blendB = Math.round(b * opacity + 255 * (1 - opacity));
  return `#${blendR.toString(16).padStart(2, '0')}${blendG.toString(16).padStart(2, '0')}${blendB.toString(16).padStart(2, '0')}`;
}

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

/**
 * Fetches activity-level time breakdown for a specific category.
 *
 * @param categoryId — The category to drill down into (null = no selection)
 * @param categoryColor — The hex color of the selected category (for tonal variations)
 * @param selectedDate — YYYY-MM-DD string
 * @param period — 'daily' or 'weekly'
 */
export function useActivityBreakdown(
  categoryId: string | null,
  categoryColor: string,
  selectedDate: string,
  period: InsightsPeriod,
): UseActivityBreakdownResult {
  const timezone = getCurrentTimezone();

  const { startOfRangeUTC, endOfRangeUTC } = useMemo(() => {
    if (period === 'daily') {
      return {
        startOfRangeUTC: getStartOfDay(selectedDate, timezone).toISOString(),
        endOfRangeUTC: getEndOfDay(selectedDate, timezone).toISOString(),
      };
    }
    const { weekStart, weekEnd } = getWeekRange(selectedDate);
    return {
      startOfRangeUTC: getStartOfDay(weekStart, timezone).toISOString(),
      endOfRangeUTC: getEndOfDay(weekEnd, timezone).toISOString(),
    };
  }, [selectedDate, period, timezone]);

  // Only run the query if a category is selected
  const { data: activityRows, isLoading } = useQuery<InsightsActivityRow>(
    categoryId ? INSIGHTS_ACTIVITY_QUERY : 'SELECT 1 WHERE 0',
    categoryId
      ? [endOfRangeUTC, startOfRangeUTC, endOfRangeUTC, startOfRangeUTC, categoryId]
      : [],
  );

  const result = useMemo(() => {
    if (!categoryId || activityRows.length === 0) {
      return { activities: [], totalSeconds: 0 };
    }

    const totalSeconds = activityRows.reduce((sum, r) => sum + r.total_seconds, 0);

    const activities: ActivitySlice[] = activityRows.map((row, index) => {
      const opacityIndex = Math.min(index, OPACITY_STEPS.length - 1);
      return {
        activityId: row.activity_id,
        activityName: row.activity_name,
        totalSeconds: row.total_seconds,
        totalMinutes: Math.round(row.total_seconds / 60),
        percentage: totalSeconds > 0
          ? Math.round((row.total_seconds / totalSeconds) * 100)
          : 0,
        color: tonalVariation(categoryColor, OPACITY_STEPS[opacityIndex]),
      };
    });

    return { activities, totalSeconds };
  }, [activityRows, categoryId, categoryColor]);

  return {
    activities: result.activities,
    totalSeconds: result.totalSeconds,
    isLoading,
  };
}
