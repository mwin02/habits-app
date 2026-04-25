/**
 * SQL query for the recommended-activity engine. Returns recent completed
 * time entries within the last 60 days, joined to activity + category
 * metadata. The hook scores them in JS by hour-of-day + weekday + recency.
 *
 * Filters: not deleted (entry, activity, category), entry has ended, activity
 * + category not archived. Ordered newest first so the recency-decay loop
 * sees the freshest entries first.
 */
export const RECOMMENDATION_QUERY = `
  SELECT
    te.started_at   AS started_at,
    te.timezone     AS timezone,
    a.id            AS activity_id,
    a.name          AS activity_name,
    c.name          AS category_name,
    c.color         AS category_color
  FROM time_entries te
  JOIN activities a ON a.id = te.activity_id
  JOIN categories c ON c.id = a.category_id
  WHERE te.deleted_at IS NULL
    AND te.ended_at IS NOT NULL
    AND a.deleted_at IS NULL
    AND a.is_archived = 0
    AND c.deleted_at IS NULL
    AND c.is_archived = 0
    AND te.started_at >= datetime('now', '-60 days')
  ORDER BY te.started_at DESC
`;
