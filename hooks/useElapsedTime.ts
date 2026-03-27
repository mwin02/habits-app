import { useState, useEffect, useRef } from 'react';

/**
 * Computes and live-updates the elapsed seconds since a given start time.
 *
 * Key design:
 * - Returns 0 when startedAt is null (no timer running)
 * - Recalculates `now - startedAt` every second (never accumulates)
 * - Computes immediately on mount (no 1-second delay)
 * - Cleans up interval on unmount or when startedAt changes
 */
export function useElapsedTime(startedAt: string | null): number {
  const [elapsed, setElapsed] = useState<number>(() => compute(startedAt));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (startedAt === null) {
      setElapsed(0);
      return;
    }

    // Compute immediately
    setElapsed(compute(startedAt));

    // Update every second
    intervalRef.current = setInterval(() => {
      setElapsed(compute(startedAt));
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startedAt]);

  return elapsed;
}

function compute(startedAt: string | null): number {
  if (startedAt === null) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}
