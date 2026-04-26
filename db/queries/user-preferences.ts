import { db } from "@/lib/powersync";
import { generateId } from "@/lib/uuid";
import type { UserPreferencesRecord } from "../schema";
import { nowUTC } from "./_helpers";

export type InsightsPeriod = "daily" | "weekly" | "monthly";

/** 0=Mon … 6=Sun. */
export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DEFAULT_WEEK_START_DAY: WeekStartDay = 0;
export const DEFAULT_INSIGHTS_PERIOD: InsightsPeriod = "daily";

/**
 * SQL query for the singleton user preferences row.
 * Use with useQuery for reactive reads.
 */
export const USER_PREFERENCES_QUERY = `
  SELECT id, user_id, week_start_day, default_insights_period, default_timezone,
         created_at, updated_at, deleted_at
  FROM user_preferences
  WHERE deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1
`;

export async function getUserPreferences(): Promise<UserPreferencesRecord | null> {
  return db.getOptional<UserPreferencesRecord>(USER_PREFERENCES_QUERY);
}

export interface UserPreferencesPatch {
  week_start_day?: number | null;
  default_insights_period?: InsightsPeriod | null;
  default_timezone?: string | null;
}

/** Partial update of the singleton preferences row. Inserts a row if missing. */
export async function updateUserPreferences(
  patch: UserPreferencesPatch,
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (patch.week_start_day !== undefined) {
    fields.push("week_start_day = ?");
    values.push(patch.week_start_day);
  }
  if (patch.default_insights_period !== undefined) {
    fields.push("default_insights_period = ?");
    values.push(patch.default_insights_period);
  }
  if (patch.default_timezone !== undefined) {
    fields.push("default_timezone = ?");
    values.push(patch.default_timezone);
  }

  if (fields.length === 0) return;

  const now = nowUTC();
  fields.push("updated_at = ?");
  values.push(now);

  const existing = await getUserPreferences();
  if (!existing) {
    await db.execute(
      `INSERT INTO user_preferences
         (id, user_id, week_start_day, default_insights_period, default_timezone,
          created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?)`,
      [
        generateId(),
        patch.week_start_day ?? DEFAULT_WEEK_START_DAY,
        patch.default_insights_period ?? DEFAULT_INSIGHTS_PERIOD,
        patch.default_timezone ?? null,
        now,
        now,
      ],
    );
    return;
  }

  await db.execute(
    `UPDATE user_preferences
     SET ${fields.join(", ")}
     WHERE deleted_at IS NULL`,
    values,
  );
}
