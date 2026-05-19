import { useEffect } from 'react';
import * as storageService from '../services/storageService';
import { runExpenseCategoryMigration } from '../services/expenseMigration';
import { promoteStaged } from '../services/foundItemService';
import { checkAndDeliverLetters } from '../services/letterService';
import { checkForPlacement } from '../services/roomPresenceService';
import { STORAGE_KEYS } from '../constants/storage';
import { VALID_EMOTIONS, EMOTION_MESSAGES } from '../constants/emotion';
import { useExpenseStore } from '../store/expenseStore';
import { useUserStore, getLevel, getRoomStage } from '../store/userStore';
import { useEmotionStore } from '../store/emotionStore';
import { Expense, UserState, SobagiEmotion } from '../types';
import { getLocalDateString } from '../utils/date';

let appInitialized = false;
let prevVisitDate: string | null = null;

export function getPrevVisitDate(): string | null {
  return prevVisitDate;
}

function computeRecordedDaysCount(expenses: Expense[]): number {
  return new Set(expenses.map((e) => getLocalDateString(new Date(e.createdAt)))).size;
}

export function useAppInit(): boolean {
  useEffect(() => {
    if (appInitialized) return;
    appInitialized = true;

    async function loadStored() {
      try {
        await runExpenseCategoryMigration();

        const [userData, expenses, lastEmotionRaw] = await Promise.all([
          storageService.load<UserState>(STORAGE_KEYS.USER),
          storageService.load<Expense[]>(STORAGE_KEYS.EXPENSES),
          storageService.load<string>(STORAGE_KEYS.LAST_EMOTION),
        ]);

        if (expenses) useExpenseStore.getState().hydrate(expenses);

        const recomputedDays = expenses ? computeRecordedDaysCount(expenses) : 0;
        if (userData) {
          // Always recompute recordedDaysCount from expenses for correctness.
          // This also handles users migrating from the old exp-based system.
          useUserStore.getState().hydrate({
            ...userData,
            recordedDaysCount: recomputedDays,
            level: getLevel(recomputedDays),
            roomStage: getRoomStage(recomputedDays),
            // exp was removed — strip it from any legacy stored object
          });
        }

        await promoteStaged();
        // Found-item eval moved to saveExpense (first record of day).
        // App init only promotes already-staged items; it does not re-evaluate
        // triggers, so the eval fires exactly once per calendar day, tied to
        // the day's first meaningful record (spending or no-spend).

        const storedVisitDate = await storageService.load<string>(STORAGE_KEYS.LAST_VISIT_DATE);
        prevVisitDate = storedVisitDate;
        const today = getLocalDateString(new Date());
        void storageService.save(STORAGE_KEYS.LAST_VISIT_DATE, today);
        await checkAndDeliverLetters(recomputedDays);

        const emotion: SobagiEmotion =
          lastEmotionRaw != null && VALID_EMOTIONS.includes(lastEmotionRaw as SobagiEmotion)
            ? (lastEmotionRaw as SobagiEmotion)
            : 'happy';

        await checkForPlacement(emotion, recomputedDays, prevVisitDate, expenses ?? []);

        useEmotionStore.setState({
          currentEmotion: emotion,
          currentMessage: EMOTION_MESSAGES[emotion],
        });
      } catch {
        // Storage unavailable in sandbox — use default state
      }
    }

    loadStored();
  }, []);

  return true;
}
