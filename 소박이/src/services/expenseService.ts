import { Expense, ExpenseCategory, UserState, RecordKind } from '../types';
import * as storageService from './storageService';
import { STORAGE_KEYS } from '../constants/storage';
import { useExpenseStore } from '../store/expenseStore';
import { useUserStore } from '../store/userStore';
import { getLocalDateString, expenseLocalDate } from '../utils/date';
import { checkForFoundItem } from './foundItemService';
import { kindForCategory } from '../constants/categories';
import { computeRecordingStreak } from './roomPresenceService';
import { generateExpenseId } from '../utils/id';

export async function saveExpense(expense: Expense): Promise<void> {
  const expenseStore = useExpenseStore.getState();
  const userStore = useUserStore.getState();

  const todayStr = getLocalDateString(new Date());
  const expenseDateStr = expenseLocalDate(expense);
  const isRealTimeRecord = expenseDateStr === todayStr;

  // Streak: only the first real-time (today-dated) record of the day advances it.
  // Past-date catch-up records are quiet — they never affect streak.
  const todayExpenses = expenseStore.getTodayExpenses();
  const isFirstRecordToday = isRealTimeRecord && todayExpenses.length === 0;
  if (isFirstRecordToday) {
    const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));
    const yesterdayHadRecord = expenseStore.expenses.some(
      (e) => expenseLocalDate(e) === yesterdayStr,
    );
    const newStreak = yesterdayHadRecord ? userStore.streak + 1 : 1;
    userStore.setStreak(newStreak);
  }

  // Check before adding: is this expense's local date a brand-new recorded day?
  const isNewDay = !expenseStore.expenses.some(
    (e) => expenseLocalDate(e) === expenseDateStr,
  );

  expenseStore.addExpense(expense);
  userStore.incrementTotalRecordCount();

  // Room/level progression is day-based, not transaction-based.
  if (isNewDay) {
    userStore.incrementRecordedDays();
  }

  // Persist to storage. Stores are already updated in memory, so this is the
  // durability step. Awaited (not fire-and-forget) so the EXPENSES write —
  // the user's actual records — completes its retry cycle before we proceed
  // to navigation. A failed write is logged inside storageService; the
  // next-init recompute is the backstop.
  const updatedExpenses = useExpenseStore.getState().expenses;
  const s = useUserStore.getState();
  const updatedUser: UserState = {
    level: s.level,
    streak: s.streak,
    totalRecordCount: s.totalRecordCount,
    recordedDaysCount: s.recordedDaysCount,
    roomStage: s.roomStage,
    pebbleCount: s.pebbleCount,
    restsToday: s.restsToday,
    lastRestDate: s.lastRestDate,
    lastRestAt: s.lastRestAt,
  };

  await storageService.save(STORAGE_KEYS.EXPENSES, updatedExpenses);
  await storageService.save(STORAGE_KEYS.USER, updatedUser);

  // Found-item eval: only fires on the first real-time record of the day.
  // Both regular expenses and no-spend records qualify as "first meaningful
  // record." Subsequent records same-day don't reach this branch, so the
  // once-per-day rule is enforced naturally without a separate gate.
  if (isFirstRecordToday) {
    await checkForFoundItem(updatedExpenses, s.recordedDaysCount);
  }
}

// No-spend record: a quiet daily mark with amount 0 and category 'no_spend'.
// Caller passes the ISO `createdAt` so the same path serves both real-time
// (today) and retroactive (past-date) no-spend marks. saveExpense's existing
// `isRealTimeRecord` check keeps past-date marks from advancing streak or
// triggering found-item eval — past no-spend stays quiet by construction.
export async function recordNoSpend(createdAt: string): Promise<void> {
  const expense: Expense = {
    id: generateExpenseId(),
    kind: 'spending',
    amount: 0,
    category: 'no_spend',
    sobagiEmotion: 'happy',
    createdAt,
    // Captured in the current device tz; equals the createdAt-derived date by
    // construction, but stored so the day stays stable across tz changes.
    localDate: getLocalDateString(new Date(createdAt)),
  };
  await saveExpense(expense);
}

export function updateExpense(
  id: string,
  patch: { amount: number; category: ExpenseCategory; memo?: string; kind: RecordKind },
): void {
  useExpenseStore.getState().updateExpense(id, patch);
  void storageService.save(STORAGE_KEYS.EXPENSES, useExpenseStore.getState().expenses);
}

export function deleteExpense(id: string): void {
  const userStore = useUserStore.getState();
  useExpenseStore.getState().deleteExpense(id);

  const expenses = useExpenseStore.getState().expenses;
  const todayStr = getLocalDateString(new Date());

  // Recompute derived user state from the remaining expenses. Deleting the
  // only record on a unique day collapses recordedDaysCount (and therefore
  // level / room stage / dialogue tier). Deleting yesterday's only record
  // may also have broken the current streak. Both must be re-derived here
  // — otherwise the UI shows inflated values until the next app init.
  const newRecordedDays = new Set(
    expenses.map((e) => expenseLocalDate(e)),
  ).size;
  userStore.setRecordedDaysCount(newRecordedDays);
  userStore.setStreak(computeRecordingStreak(expenses, todayStr));
  userStore.setTotalRecordCount(expenses.length);

  // Persist both stores. Fresh UserState snapshot from the updated store.
  const s = useUserStore.getState();
  const updatedUser: UserState = {
    level: s.level,
    streak: s.streak,
    totalRecordCount: s.totalRecordCount,
    recordedDaysCount: s.recordedDaysCount,
    roomStage: s.roomStage,
    pebbleCount: s.pebbleCount,
    restsToday: s.restsToday,
    lastRestDate: s.lastRestDate,
    lastRestAt: s.lastRestAt,
  };
  void storageService.save(STORAGE_KEYS.EXPENSES, expenses);
  void storageService.save(STORAGE_KEYS.USER, updatedUser);
}

/**
 * Hydration normalization. Applied at read time only — does NOT mutate
 * storage. Ensures `expense.kind` always reflects the category-derived
 * truth, regardless of what was stored. Forgiving: missing kind → derived,
 * mismatched kind → corrected, no throw.
 */
export function normalizeExpense(raw: Expense): Expense {
  const derivedKind = kindForCategory(raw.category);
  return {
    ...raw,
    kind: derivedKind,
  };
}
