import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { db } from "@/lib/powersync";

interface TimeEntryExportRow {
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  timezone: string | null;
  category_name: string | null;
  activity_name: string | null;
  tags: string | null;
  note: string | null;
}

const QUERY = `
  SELECT
    te.started_at      AS started_at,
    te.ended_at        AS ended_at,
    te.duration_seconds AS duration_seconds,
    te.timezone        AS timezone,
    c.name             AS category_name,
    a.name             AS activity_name,
    (
      SELECT GROUP_CONCAT(t.name, ', ')
      FROM entry_tags et
      JOIN tags t ON t.id = et.tag_id
      WHERE et.entry_id = te.id AND t.deleted_at IS NULL
    )                  AS tags,
    te.note            AS note
  FROM time_entries te
  LEFT JOIN activities a ON a.id = te.activity_id
  LEFT JOIN categories c ON c.id = a.category_id
  WHERE te.deleted_at IS NULL
  ORDER BY te.started_at ASC
`;

const COLUMNS: (keyof TimeEntryExportRow)[] = [
  "started_at",
  "ended_at",
  "duration_seconds",
  "timezone",
  "category_name",
  "activity_name",
  "tags",
  "note",
];

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(rows: TimeEntryExportRow[]): string {
  const lines: string[] = [COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(COLUMNS.map((col) => escapeCell(row[col])).join(","));
  }
  // Trailing newline so editors that expect EOL don't complain.
  return lines.join("\n") + "\n";
}

function buildFilename(now: Date): string {
  const pad = (n: number): string => n.toString().padStart(2, "0");
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `horae-time-entries-${stamp}.csv`;
}

/**
 * Builds a CSV with one row per non-deleted time entry, joined with
 * category + activity names and a comma-separated tag column. Times stay
 * as ISO 8601 UTC alongside the entry's stored IANA timezone so the
 * caller can render in the original local time.
 */
export async function exportTimeEntriesAsCsv(): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Sharing is not available on this device");
  }

  const rows = await db.getAll<TimeEntryExportRow>(QUERY);
  const csv = buildCsv(rows);

  const file = new File(Paths.cache, buildFilename(new Date()));
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(csv);

  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: "Export time entries",
  });
}
