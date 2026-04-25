/**
 * Application-level types that add semantics on top of the raw database records.
 * Use these in components and hooks — they provide better type safety than raw records.
 */

// Re-export raw record types for query results
export type {
  ActivityRecord,
  CategoryRecord,
  DailySummaryRecord,
  IdealAllocationRecord,
  TimeEntryRecord,
} from "./schema";

/** Source of a time entry */
export type TimeEntrySource = "timer" | "manual" | "retroactive" | "import";

/** A category with its activities (for the activity picker) */
export interface CategoryWithActivities {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  isPreset: boolean;
  sortOrder: number;
  activities: ActivityItem[];
}

/** An activity as displayed in the UI */
export interface ActivityItem {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  name: string;
  isPreset: boolean;
}

/** The currently running timer (if any) */
export interface RunningTimer {
  entryId: string;
  activityId: string;
  activityName: string;
  categoryName: string;
  categoryColor: string;
  startedAt: Date;
  elapsedSeconds: number;
  timezone: string;
}

/** A time-of-day-aware activity recommendation for the idle TimerCard */
export interface RecommendedActivity {
  activityId: string;
  activityName: string;
  categoryName: string;
  categoryColor: string;
}

/** A time entry as displayed on the timeline */
export interface TimelineEntry {
  id: string;
  activityName: string;
  categoryName: string;
  categoryColor: string;
  startedAt: Date;
  endedAt: Date | null;
  isRunning: boolean;
  durationSeconds: number | null;
  note: string | null;
  source: TimeEntrySource;
  timezone: string;
  /** True if the real entry started before this day's local midnight (clipped at top) */
  continuesBefore: boolean;
  /** True if the real entry extends past this day's local midnight (clipped at bottom) */
  continuesAfter: boolean;
}

/** A gap in the timeline (untracked time) */
export interface TimelineGap {
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
}

/**
 * How actual time relates to the ideal target.
 *  - 'at_least'  → user wants actual ≥ target (e.g. work, exercise)
 *  - 'at_most'   → user wants actual ≤ target (e.g. entertainment, doomscrolling)
 *  - 'around'    → user wants actual ≈ target (symmetric tolerance)
 */
export type GoalDirection = 'at_least' | 'at_most' | 'around';

/** Insight data for a single category */
export interface CategoryInsight {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  actualMinutes: number;
  targetMinutes: number | null;
  differenceMinutes: number | null;
  /** null when the category has no goal. */
  goalDirection: GoalDirection | null;
}

/** Daily coverage stats */
export interface DayCoverage {
  date: string;
  trackedMinutes: number;
  coveragePercent: number;
}
