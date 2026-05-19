import { Expense, ExpenseCategory, UserState } from '../types';
import * as storageService from './storageService';
import { STORAGE_KEYS } from '../constants/storage';
import { useExpenseStore } from '../store/expenseStore';
import { useUserStore } from '../store/userStore';
import { getLocalDateString } from '../utils/date';
import { checkForFoundItem } from './foundItemService';

export async function saveExpense(expense: Expense): Promise<void> {
  const expenseStore = useExpenseStore.getState();
  const userStore = useUserStore.getState();

  const todayStr = getLocalDateString(new Date());
  const expenseDateStr = getLocalDateString(new Date(expense.createdAt));
  const isRealTimeRecord = expenseDateStr === todayStr;

  // Streak: only the first real-time (today-dated) record of the day advances it.
  // Past-date catch-up records are quiet — they never affect streak.
  const todayExpenses = expenseStore.getTodayExpenses();
  const isFirstRecordToday = isRealTimeRecord && todayExpenses.length === 0;
  if (isFirstRecordToday) {
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

  // Found-item eval: only fires on the first real-time record of the day.
  // Both regular expenses and no-spend records qualify as "first meaningful
  // record." Subsequent records same-day don't reach this branch, so the
  // once-per-day rule is enforced naturally without a separate gate.
  if (isFirstRecordToday) {
    await checkForFoundItem(updatedExpenses, s.recordedDaysCount);
  }
}

// No-spend record: a quiet daily mark with amount 0 and category 'no_spend'.
// Counts toward streak and recorded-day count, and qualifies as the day's
// first meaningful record for found-item eval. Created via saveExpense so
// all persistence/streak/eval plumbing stays in one place.
export async function recordNoSpend(): Promise<void> {
  const expense: Expense = {
    id: Date.now().toString(),
    amount: 0,
    category: 'no_spend',
    sobagiEmotion: 'happy',
    createdAt: new Date().toISOString(),
  };
  await saveExpense(expense);
}

export function updateExpense(
  id: string,
  patch: { amount: number; category: ExpenseCategory; memo?: string },
): void {
  useExpenseStore.getState().updateExpense(id, patch);
  void storageService.save(STORAGE_KEYS.EXPENSES, useExpenseStore.getState().expenses);
}

export function deleteExpense(id: string): void {
  useExpenseStore.getState().deleteExpense(id);
  void storageService.save(STORAGE_KEYS.EXPENSES, useExpenseStore.getState().expenses);
}
