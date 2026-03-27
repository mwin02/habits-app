import { create } from 'zustand';
import { getCurrentTimezone, getTodayDate } from '@/lib/timezone';

/**
 * Zustand store for ephemeral UI state.
 *
 * All persistent data lives in PowerSync/SQLite — this store is only
 * for transient UI concerns that don't need to survive app restarts.
 */

interface UIState {
  /** Currently selected date for the timeline view (YYYY-MM-DD) */
  selectedDate: string;
  /** Set the selected date for the timeline */
  setSelectedDate: (date: string) => void;
  /** Reset selected date to today */
  resetToToday: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedDate: getTodayDate(getCurrentTimezone()),

  setSelectedDate: (date: string) => set({ selectedDate: date }),

  resetToToday: () =>
    set({ selectedDate: getTodayDate(getCurrentTimezone()) }),
}));
