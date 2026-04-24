import * as Notifications from "expo-notifications";

import { formatDuration } from "./timezone";

/** Singleton identifier for the idle reminder. */
const IDLE_REMINDER_ID = "idle-reminder";

/** Prefix for per-entry long-running reminder identifiers. */
const LONG_RUNNING_PREFIX = "long-running-";

function longRunningId(entryId: string): string {
  return `${LONG_RUNNING_PREFIX}${entryId}`;
}

/**
 * Configure foreground presentation. Must be called once at module load
 * (e.g. from the root layout) so that notifications still appear as banners
 * while the app is open.
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export interface PermissionResult {
  granted: boolean;
}

/**
 * Request permission once per install. Caller is responsible for persisting
 * the fact that the ask has happened (via notification_preferences).
 * If `hasAsked` is already true we only read current status, never prompt again.
 */
export async function requestPermissionsIfNeeded(
  hasAsked: boolean
): Promise<PermissionResult> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return { granted: true };
  if (hasAsked) return { granted: false };

  const response = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: false,
    },
  });
  return { granted: response.granted };
}

/** True if the OS currently grants notification permission. */
export async function hasNotificationPermission(): Promise<boolean> {
  const status = await Notifications.getPermissionsAsync();
  return status.granted;
}

async function scheduleAt(
  identifier: string,
  title: string,
  body: string,
  fireAt: Date
): Promise<void> {
  const seconds = Math.max(1, Math.round((fireAt.getTime() - Date.now()) / 1000));
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    },
  });
}

/**
 * Schedule (or reschedule) the idle reminder to fire at `fireAt`.
 * Cancels any existing idle reminder first so the new time replaces the old.
 */
export async function scheduleIdleReminder(fireAt: Date): Promise<void> {
  await cancelIdleReminder();
  await scheduleAt(
    IDLE_REMINDER_ID,
    "Still there?",
    "It's been 30 minutes since your last session. Want to start something?",
    fireAt
  );
}

export async function cancelIdleReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(IDLE_REMINDER_ID);
}

export interface LongRunningParams {
  entryId: string;
  activityName: string;
  fireAt: Date;
  /** Elapsed seconds at the moment the notification will fire. */
  firesAfterSeconds: number;
}

/**
 * Schedule a long-running reminder for a specific entry. Cancels any prior
 * reminder for the same entry first.
 */
export async function scheduleLongRunningReminder(
  params: LongRunningParams
): Promise<void> {
  const id = longRunningId(params.entryId);
  await Notifications.cancelScheduledNotificationAsync(id);
  await scheduleAt(
    id,
    `${params.activityName} has been running a while`,
    `${formatDuration(params.firesAfterSeconds)} so far. Tap if you meant to stop earlier.`,
    params.fireAt
  );
}

export async function cancelLongRunningReminder(entryId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(longRunningId(entryId));
}

/** Cancel every notification this app has scheduled. */
export async function cancelAllAppNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** All scheduled identifiers currently held by the OS for this app. */
export async function getScheduledIds(): Promise<string[]> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.map((n) => n.identifier);
}
