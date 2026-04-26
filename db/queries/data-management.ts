import { db } from "@/lib/powersync";
import { cancelAllAppNotifications } from "@/lib/notifications";
import {
  seedNotificationPreferencesIfNeeded,
  seedPresetsIfNeeded,
  seedUserPreferencesIfNeeded,
} from "@/db/seed";

/**
 * Hard-deletes every time entry plus its tag links. Categories,
 * activities, tags, and prefs are preserved so the user can keep
 * tracking immediately.
 *
 * Pre-sync only — once Phase 3 ships we'll move to soft delete so other
 * devices learn about the removal.
 */
export async function deleteAllTimeEntries(): Promise<void> {
  await db.writeTransaction(async (tx) => {
    await tx.execute("DELETE FROM entry_tags");
    await tx.execute("DELETE FROM time_entries");
    await tx.execute("DELETE FROM daily_summaries");
  });
  // Any scheduled long-running / idle reminders are now stale — clear them.
  // The reactive scheduler will reschedule on the next running entry.
  await cancelAllAppNotifications();
}

/**
 * Hard-deletes every user-owned row across every table, then re-seeds
 * preset categories/activities and singleton preference rows so the app
 * lands in the same shape as a first launch. Pre-sync only.
 */
export async function deleteAllUserData(): Promise<void> {
  await db.writeTransaction(async (tx) => {
    await tx.execute("DELETE FROM entry_tags");
    await tx.execute("DELETE FROM time_entries");
    await tx.execute("DELETE FROM ideal_allocations");
    await tx.execute("DELETE FROM tags");
    await tx.execute("DELETE FROM activities");
    await tx.execute("DELETE FROM categories");
    await tx.execute("DELETE FROM notification_preferences");
    await tx.execute("DELETE FROM user_preferences");
    await tx.execute("DELETE FROM daily_summaries");
  });
  await cancelAllAppNotifications();
  await seedPresetsIfNeeded();
  await seedNotificationPreferencesIfNeeded();
  await seedUserPreferencesIfNeeded();
}
