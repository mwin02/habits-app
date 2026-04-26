/** Shared low-level helpers for query modules. */

import type { TimeEntrySource } from '../models';

export function nowUTC(): string {
  return new Date().toISOString();
}

/**
 * Closed alphabet of `time_entries.source` values. Keep this in sync with
 * the `TimeEntrySource` union in `db/models.ts` — TS will fail compile if
 * they drift, since `assertTimeEntrySource` reads from this object.
 */
export const TIME_ENTRY_SOURCES = {
  timer: 'timer',
  manual: 'manual',
  retroactive: 'retroactive',
  import: 'import',
} as const satisfies Record<TimeEntrySource, TimeEntrySource>;

/**
 * Dev-only guard against stray strings reaching the `source` column. In
 * production this is a no-op so we don't pay the cost on the hot path.
 */
export function assertTimeEntrySource(value: TimeEntrySource): TimeEntrySource {
  if (__DEV__) {
    if (!(value in TIME_ENTRY_SOURCES)) {
      throw new Error(`Invalid time_entries.source value: ${String(value)}`);
    }
  }
  return value;
}
