/**
 * Application-level types that add semantics on top of the raw database records.
 * Use these in components and hooks — they provide better type safety than raw records.
 */

// Re-export raw record types for query results
export type {
  CategoryRecord,
  ActivityRecord,
  TimeEntryRecord,
  IdealAllocationRecord,
  DailySummaryRecord,
} from './schema';

/** Source of a time entry */
export type TimeEntrySource = 'timer' | 'manual' | 'retroactive' | 'import';

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
}

/** A time entry as displayed on the timeline */
export interface TimelineEntry {
  id: string;
  activityName: string;
  categoryName: string;
  categoryColor: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  note: string | null;
  source: TimeEntrySource;
}

/** A gap in the timeline (untracked time) */
export interface TimelineGap {
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
}

/** Insight data for a single category */
export interface CategoryInsight {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  actualMinutes: number;
  targetMinutes: number | null;
  differenceMinutes: number | null;
}

/** Daily coverage stats */
export interface DayCoverage {
  date: string;
  trackedMinutes: number;
  wakingMinutes: number; // assumes ~16h waking day (960 min)
  coveragePercent: number;
}
