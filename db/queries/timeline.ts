/** Row shape returned by the timeline detail query */
export interface TimelineEntryRow {
  entry_id: string;
  activity_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  timezone: string;
  note: string | null;
  source: string;
  activity_name: string;
  category_name: string;
  category_color: string;
  category_icon: string | null;
}

/**
 * SQL query for timeline entries — joins time_entries with activity and category.
 * Params: [endOfDayUTC, startOfDayUTC]
 */
export const TIMELINE_ENTRIES_QUERY = `
  SELECT
    te.id             AS entry_id,
    te.activity_id    AS activity_id,
    te.started_at     AS started_at,
    te.ended_at       AS ended_at,
    te.duration_seconds AS duration_seconds,
    te.timezone       AS timezone,
    te.note           AS note,
    te.source         AS source,
    a.name            AS activity_name,
    c.name            AS category_name,
    c.color           AS category_color,
    c.icon            AS category_icon
  FROM time_entries te
  JOIN activities a ON a.id = te.activity_id
  JOIN categories c ON c.id = a.category_id
  WHERE te.deleted_at IS NULL
    AND te.started_at <= ?
    AND (te.ended_at IS NULL OR te.ended_at >= ?)
  ORDER BY te.started_at
`;
