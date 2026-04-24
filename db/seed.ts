import { db } from '@/lib/powersync';
import { generateId } from '@/lib/uuid';
import { PRESET_CATEGORIES } from '@/constants/presets';

/**
 * Seed preset categories and activities on first launch.
 * Checks if presets already exist to avoid duplicates.
 */
export async function seedPresetsIfNeeded(): Promise<void> {
  const existing = await db.getOptional<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories WHERE is_preset = 1'
  );

  if (existing && existing.count > 0) {
    return; // Already seeded
  }

  const now = new Date().toISOString();

  await db.writeTransaction(async (tx) => {
    for (let catIdx = 0; catIdx < PRESET_CATEGORIES.length; catIdx++) {
      const preset = PRESET_CATEGORIES[catIdx];
      const categoryId = generateId();

      await tx.execute(
        `INSERT INTO categories (id, user_id, name, color, icon, is_preset, sort_order, is_archived, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, 1, ?, 0, ?, ?)`,
        [categoryId, preset.name, preset.color, preset.icon, catIdx, now, now]
      );

      for (let actIdx = 0; actIdx < preset.activities.length; actIdx++) {
        const activityName = preset.activities[actIdx];
        const activityId = generateId();

        await tx.execute(
          `INSERT INTO activities (id, user_id, category_id, name, is_preset, sort_order, is_archived, created_at, updated_at)
           VALUES (?, NULL, ?, ?, 1, ?, 0, ?, ?)`,
          [activityId, categoryId, activityName, actIdx, now, now]
        );
      }
    }
  });

  console.log(`Seeded ${PRESET_CATEGORIES.length} categories with activities`);
}

/**
 * Seed a single notification_preferences row on first launch.
 * Idempotent — no-op if any non-deleted row already exists.
 */
export async function seedNotificationPreferencesIfNeeded(): Promise<void> {
  const existing = await db.getOptional<{ count: number }>(
    'SELECT COUNT(*) as count FROM notification_preferences WHERE deleted_at IS NULL'
  );

  if (existing && existing.count > 0) {
    return;
  }

  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO notification_preferences
       (id, user_id, idle_reminder_enabled, long_running_enabled,
        threshold_override_seconds, has_asked_permission,
        created_at, updated_at)
     VALUES (?, NULL, 1, 1, NULL, 0, ?, ?)`,
    [generateId(), now, now]
  );
}
