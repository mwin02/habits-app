import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { hasNotificationPermission } from "@/lib/notifications";

export interface NotificationPermissionStatus {
  /** null = unknown (still resolving on first mount). */
  granted: boolean | null;
  /** Force a fresh check (e.g. after deep-linking to iOS Settings). */
  refresh: () => void;
}

/**
 * Tracks the OS notification-permission state reactively.
 *
 * Refreshes on mount and on every background → active AppState transition,
 * mirroring the foreground pattern used by useForgottenTimer.
 */
export function useNotificationPermissionStatus(): NotificationPermissionStatus {
  const [granted, setGranted] = useState<boolean | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const refresh = useCallback(() => {
    void (async () => {
      const value = await hasNotificationPermission();
      setGranted(value);
    })();
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        refresh();
      }
      appStateRef.current = nextState;
    });
    return () => {
      subscription.remove();
    };
  }, [refresh]);

  return { granted, refresh };
}
