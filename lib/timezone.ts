/**
 * Timezone utilities.
 *
 * All times are stored in UTC (ISO 8601 strings). Each time_entry also stores
 * the IANA timezone that was active when it was created, so we can display
 * times in their original local timezone regardless of the user's current tz.
 */

/** Get the device's current IANA timezone (e.g., 'America/New_York') */
export function getCurrentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Format an ISO 8601 UTC string into a human-readable time in the given timezone.
 * Returns e.g. "9:30 AM", "2:15 PM".
 */
export function formatTimeInTimezone(isoString: string, timezone: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  });
}

/**
 * Format an ISO 8601 UTC string into a short date string in the given timezone.
 * Returns e.g. "Mar 24, 2026".
 */
export function formatDateInTimezone(isoString: string, timezone: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  });
}

/**
 * Check if an ISO 8601 UTC string falls on today's date in the given timezone.
 */
export function isToday(isoString: string, timezone: string): boolean {
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: timezone }); // 'YYYY-MM-DD'
  const dateStr = new Date(isoString).toLocaleDateString('en-CA', { timeZone: timezone });
  return todayStr === dateStr;
}

/**
 * Check if two ISO 8601 UTC strings fall on the same calendar day in the given timezone.
 */
export function isSameDay(iso1: string, iso2: string, timezone: string): boolean {
  const d1 = new Date(iso1).toLocaleDateString('en-CA', { timeZone: timezone });
  const d2 = new Date(iso2).toLocaleDateString('en-CA', { timeZone: timezone });
  return d1 === d2;
}

/**
 * Get today's date as 'YYYY-MM-DD' in the given timezone.
 */
export function getTodayDate(timezone: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}

/**
 * Get the UTC instant for local midnight of `dateStr` in the given timezone.
 * DST-safe. Works under Hermes (no reliance on `new Date(localeString)`).
 */
export function getStartOfDay(dateStr: string, timezone: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Guess: pretend local midnight is UTC midnight.
  const guess = Date.UTC(y, m - 1, d);
  // Measure what local time that guess actually is in the target zone, then
  // correct by the delta. Two passes handle DST transition days correctly.
  const adjust = (ms: number): number => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date(ms));
    const get = (t: string): number =>
      Number(parts.find((p) => p.type === t)?.value ?? 0);
    const hour = get('hour') === 24 ? 0 : get('hour');
    const asIfUTC = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      hour,
      get('minute'),
      get('second'),
    );
    // `asIfUTC - ms` is the tz offset at instant `ms`.
    return ms - (asIfUTC - guess);
  };
  const first = adjust(guess);
  return new Date(adjust(first));
}

/**
 * Get the end of a day (last instant before next local midnight) in a given
 * timezone, returned as a Date object in UTC. DST-safe — uses the next day's
 * local midnight rather than adding a fixed 24h.
 */
export function getEndOfDay(dateStr: string, timezone: string): Date {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  const nextDateStr = d.toISOString().slice(0, 10);
  return new Date(getStartOfDay(nextDateStr, timezone).getTime() - 1);
}

/**
 * Format elapsed seconds into a human-readable duration string.
 * Returns e.g. "1h 30m", "45m", "2h 0m".
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format elapsed seconds into a timer display string.
 * Returns e.g. "1:30:45", "0:05:12".
 */
export function formatTimerDisplay(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number): string => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}
