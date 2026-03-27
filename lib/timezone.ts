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
 * Get the start of a day (00:00:00) in a given timezone, returned as a Date object in UTC.
 */
export function getStartOfDay(dateStr: string, timezone: string): Date {
  // Create a date string in the target timezone and convert to UTC
  const localMidnight = new Date(`${dateStr}T00:00:00`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Use a simpler approach: calculate offset
  const utcDate = new Date(`${dateStr}T00:00:00Z`);
  const tzTime = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
  const offset = tzTime.getTime() - utcDate.getTime();
  return new Date(utcDate.getTime() - offset);
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
