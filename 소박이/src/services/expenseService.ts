import { Expense, UserState } from '../types';
import * as storageService from './storageService';
import { STORAGE_KEYS } from '../constants/storage';
import { useExpenseStore } from '../store/expenseStore';
import { useUserStore } from '../store/userStore';
import { getLocalDateString } from '../utils/date';

export async function saveExpense(expense: Expense): Promise<void> {
  const expenseStore = useExpenseStore.getState();
  const userStore = useUserStore.getState();

  const todayStr = getLocalDateString(new Date());
  const expenseDateStr = getLocalDateString(new Date(expense.createdAt));
  const isRealTimeRecord = expenseDateStr === todayStr;

  // Streak: only the first real-time (today-dated) record of the day advances it.
  // Past-date catch-up records are quiet — they never affect streak.
  const todayExpenses = expenseStore.getTodayExpenses();
  if (isRealTimeRecord && todayExpenses.length === 0) {
    const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));
    const yesterdayHadRecord = expenseStore.expenses.some(
      (e) => getLocalDateString(new Date(e.createdAt)) === yesterdayStr,
    );
    const newStreak = yesterdayHadRecord ? userStore.streak + 1 : 1;
    userStore.setStreak(newStreak);
  }

  // Check before adding: is this expense's local date a brand-new recorded day?
  const isNewDay = !expenseStore.expenses.some(
    (e) => getLocalDateString(new Date(e.createdAt)) === expenseDateStr,
  );

  expenseStore.addExpense(expense);
  userStore.incrementTotalRecordCount();

  // Room/level progression is day-based, not transaction-based.
  if (isNewDay) {
    userStore.incrementRecordedDays();
  }

  // Persist to storage (fire-and-forget — stores already updated in memory)
  const updatedExpenses = useExpenseStore.getState().expenses;
  const s = useUserStore.getState();
  const updatedUser: UserState = {
    level: s.level,
    streak: s.streak,
    totalRecordCount: s.totalRecordCount,
    recordedDaysCount: s.recordedDaysCount,
    roomStage: s.roomStage,
  };

  void storageService.save(STORAGE_KEYS.EXPENSES, updatedExpenses);
  void storageService.save(STORAGE_KEYS.USER, updatedUser);
}
