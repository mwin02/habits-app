/**
 * Row shape returned by the insights aggregation query.
 */
export interface InsightsCategoryRow {
  category_id: string;
  category_name: string;
  category_color: string;
  category_icon: string | null;
  total_seconds: number;
}

/**
 * SQL query to aggregate tracked time per category for a date range.
 * Clips each entry to the queried range so midnight-spanning entries are
 * split proportionally between days. Running entries (ended_at IS NULL)
 * use the current time as their effective end.
 * Params: [endOfRangeUTC, startOfRangeUTC, endOfRangeUTC, startOfRangeUTC]
 */
export const INSIGHTS_CATEGORY_QUERY = `
  SELECT
    c.id              AS category_id,
    c.name            AS category_name,
    c.color           AS category_color,
    c.icon            AS category_icon,
    COALESCE(SUM(
      MAX(0, CAST(
        (MIN(julianday(?), julianday(COALESCE(te.ended_at, 'now')))
         - MAX(julianday(?), julianday(te.started_at))) * 86400 AS INTEGER
      ))
    ), 0) AS total_seconds
  FROM categories c
  LEFT JOIN activities a ON a.category_id = c.id AND a.deleted_at IS NULL
  LEFT JOIN time_entries te ON te.activity_id = a.id
    AND te.deleted_at IS NULL
    AND te.started_at <= ?
    AND (te.ended_at IS NULL OR te.ended_at >= ?)
  WHERE c.is_archived = 0 AND c.deleted_at IS NULL
  GROUP BY c.id
  HAVING total_seconds > 0
  ORDER BY total_seconds DESC
`;

/**
 * Row shape returned by the activity breakdown query.
 */
export interface InsightsActivityRow {
  activity_id: string;
  activity_name: string;
  total_seconds: number;
}

/**
 * SQL query to aggregate tracked time per activity within a specific category.
 * Clips each entry to the queried range so midnight-spanning entries are
 * split proportionally between days.
 * Params: [endOfRangeUTC, startOfRangeUTC, endOfRangeUTC, startOfRangeUTC, categoryId]
 */
export const INSIGHTS_ACTIVITY_QUERY = `
  SELECT
    a.id              AS activity_id,
    a.name            AS activity_name,
    COALESCE(SUM(
      MAX(0, CAST(
        (MIN(julianday(?), julianday(COALESCE(te.ended_at, 'now')))
         - MAX(julianday(?), julianday(te.started_at))) * 86400 AS INTEGER
      ))
    ), 0) AS total_seconds
  FROM activities a
  LEFT JOIN time_entries te ON te.activity_id = a.id
    AND te.deleted_at IS NULL
    AND te.started_at <= ?
    AND (te.ended_at IS NULL OR te.ended_at >= ?)
  WHERE a.category_id = ?
    AND a.is_archived = 0
    AND a.deleted_at IS NULL
  GROUP BY a.id
  HAVING total_seconds > 0
  ORDER BY total_seconds DESC
`;

/**
 * Row shape returned by the top-activities aggregation query.
 */
export interface TopActivityRow {
  activity_id: string;
  activity_name: string;
  category_id: string;
  category_name: string;
  category_color: string;
  total_seconds: number;
}

/**
 * SQL query to aggregate tracked time per activity across ALL categories.
 * Clips each entry to the queried range so midnight-spanning entries are
 * split proportionally between days. Joins activity → category for chip
 * color/name.
 * Params: [endOfRangeUTC, startOfRangeUTC, endOfRangeUTC, startOfRangeUTC]
 */
export const TOP_ACTIVITIES_QUERY = `
  SELECT
    a.id              AS activity_id,
    a.name            AS activity_name,
    c.id              AS category_id,
    c.name            AS category_name,
    c.color           AS category_color,
    COALESCE(SUM(
      MAX(0, CAST(
        (MIN(julianday(?), julianday(COALESCE(te.ended_at, 'now')))
         - MAX(julianday(?), julianday(te.started_at))) * 86400 AS INTEGER
      ))
    ), 0) AS total_seconds
  FROM activities a
  JOIN categories c ON c.id = a.category_id
  LEFT JOIN time_entries te ON te.activity_id = a.id
    AND te.deleted_at IS NULL
    AND te.started_at <= ?
    AND (te.ended_at IS NULL OR te.ended_at >= ?)
  WHERE a.is_archived = 0
    AND a.deleted_at IS NULL
    AND c.is_archived = 0
    AND c.deleted_at IS NULL
  GROUP BY a.id
  HAVING total_seconds > 0
  ORDER BY total_seconds DESC
`;
