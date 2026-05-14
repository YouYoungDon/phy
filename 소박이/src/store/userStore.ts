import { create } from 'zustand';
import { UserState } from '../types';

// Cumulative recorded-days thresholds per level.
// Index = level - 1, value = days needed to reach that level.
export const LEVEL_THRESHOLDS = [0, 7, 20, 40, 70, 110, 160] as const;

export function getLevel(days: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    const threshold = LEVEL_THRESHOLDS[i];
    if (threshold !== undefined && days >= threshold) return i + 1;
  }
  return 1;
}

// Returns the day-count target for the next level-up.
// Returns the last threshold when already at max level.
export function getNextThreshold(days: number): number {
  const level = getLevel(days);
  const next = LEVEL_THRESHOLDS[level];
  if (next !== undefined) return next;
  const last = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return last ?? 160;
}

// roomStage advances with level, but only when stage assets exist.
// Currently only stage 1 has an image — hold at 1 until further notice.
export function getRoomStage(_days: number): 1 | 2 | 3 | 4 | 5 {
  return 1;
}

interface UserStore extends UserState {
  incrementRecordedDays: () => void;
  incrementTotalRecordCount: () => void;
  setStreak: (streak: number) => void;
  hydrate: (state: UserState) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  level: 1,
  streak: 0,
  totalRecordCount: 0,
  recordedDaysCount: 0,
  roomStage: 1,
  incrementRecordedDays: () =>
    set((state) => {
      const newDays = state.recordedDaysCount + 1;
      return {
        recordedDaysCount: newDays,
        level: getLevel(newDays),
        roomStage: getRoomStage(newDays),
      };
    }),
  incrementTotalRecordCount: () =>
    set((state) => ({ totalRecordCount: state.totalRecordCount + 1 })),
  setStreak: (streak) => set({ streak }),
  hydrate: (state) => set(state),
}));
