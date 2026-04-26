import * as Application from "expo-application";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { db } from "@/lib/powersync";

/**
 * Bump per schema-shape change so importers can branch on the version.
 * The shape includes which tables are present and which columns each one
 * exposes — bump this whenever you add/remove either.
 */
export const EXPORT_SCHEMA_VERSION = 1;

type Row = Record<string, unknown>;

interface ExportPayload {
  exported_at: string;
  app_version: string | null;
  schema_version: number;
  tables: {
    categories: Row[];
    activities: Row[];
    time_entries: Row[];
    ideal_allocations: Row[];
    tags: Row[];
    entry_tags: Row[];
    notification_preferences: Row[];
    user_preferences: Row[];
  };
}

async function selectAlive(table: string): Promise<Row[]> {
  return db.getAll<Row>(`SELECT * FROM ${table} WHERE deleted_at IS NULL`);
}

async function buildPayload(): Promise<ExportPayload> {
  const [
    categories,
    activities,
    time_entries,
    ideal_allocations,
    tags,
    entry_tags,
    notification_preferences,
    user_preferences,
  ] = await Promise.all([
    selectAlive("categories"),
    selectAlive("activities"),
    selectAlive("time_entries"),
    selectAlive("ideal_allocations"),
    selectAlive("tags"),
    // entry_tags has no deleted_at column — filter by parent entry's liveness.
    db.getAll<Row>(
      `SELECT et.* FROM entry_tags et
       JOIN time_entries te ON te.id = et.entry_id
       WHERE te.deleted_at IS NULL`,
    ),
    selectAlive("notification_preferences"),
    selectAlive("user_preferences"),
  ]);

  return {
    exported_at: new Date().toISOString(),
    app_version: Application.nativeApplicationVersion,
    schema_version: EXPORT_SCHEMA_VERSION,
    tables: {
      categories,
      activities,
      time_entries,
      ideal_allocations,
      tags,
      entry_tags,
      notification_preferences,
      user_preferences,
    },
  };
}

function buildFilename(now: Date): string {
  const pad = (n: number): string => n.toString().padStart(2, "0");
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `habits-export-${stamp}.json`;
}

/**
 * Builds a JSON snapshot of every non-deleted row across user-owned tables
 * and presents the OS share sheet so the user can save / send it.
 *
 * Throws if sharing is unavailable on the device — caller handles UI.
 */
export async function exportDataAsJson(): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Sharing is not available on this device");
  }

  const payload = await buildPayload();
  const json = JSON.stringify(payload, null, 2);

  const file = new File(Paths.cache, buildFilename(new Date()));
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(json);

  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: "Export Habits data",
  });
}
