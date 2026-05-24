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

export async function saveExpense(expense: Expense): Promise<boolean> {
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
  // to navigation.
  const updatedExpenses = useExpenseStore.getState().expenses;
  const s = useUserStore.getState();
  const updatedUser = buildUserSnapshot();

  const expensesSaved = await storageService.save(STORAGE_KEYS.EXPENSES, updatedExpenses);
  if (!expensesSaved) {
    // Durability failed for the user's actual record. Undo the optimistic
    // in-memory mutation so storage and memory agree and a retry can't create a
    // duplicate. Uses the in-memory remove — NOT the async deleteExpense, whose
    // own write-failure rollback would re-add the record while storage is down.
    // Caller surfaces a gentle error and does NOT navigate to the reaction screen.
    removeExpenseFromState(expense.id);
    return false;
  }
  // USER write is non-fatal: derived state is recomputed from EXPENSES at the
  // next init, so a dropped USER write self-heals.
  await storageService.save(STORAGE_KEYS.USER, updatedUser);

  // Found-item eval: only fires on the first real-time record of the day.
  // Both regular expenses and no-spend records qualify as "first meaningful
  // record." Subsequent records same-day don't reach this branch, so the
  // once-per-day rule is enforced naturally without a separate gate.
  if (isFirstRecordToday) {
    await checkForFoundItem(updatedExpenses, s.recordedDaysCount);
  }
  return true;
}

// No-spend record: a quiet daily mark with amount 0 and category 'no_spend'.
// Caller passes the ISO `createdAt` so the same path serves both real-time
// (today) and retroactive (past-date) no-spend marks. saveExpense's existing
// `isRealTimeRecord` check keeps past-date marks from advancing streak or
// triggering found-item eval — past no-spend stays quiet by construction.
export async function recordNoSpend(createdAt: string): Promise<boolean> {
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
  return saveExpense(expense);
}

// Build the persisted UserState snapshot from the live user store.
function buildUserSnapshot(): UserState {
  const s = useUserStore.getState();
  return {
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
}

// In-memory removal + derived-state recompute (recordedDays / streak / total).
// Deleting the only record on a unique day collapses recordedDaysCount (and
// therefore level / room stage / dialogue tier); deleting yesterday's only
// record may break the streak — both re-derived here. Does NOT persist; callers
// decide. Shared by the async user-facing deleteExpense (which persists, with
// its own write-failure rollback) and saveExpense's failed-write rollback
// (which must not persist and must not re-add the record).
function removeExpenseFromState(id: string): void {
  useExpenseStore.getState().deleteExpense(id);
  const expenses = useExpenseStore.getState().expenses;
  const todayStr = getLocalDateString(new Date());
  const userStore = useUserStore.getState();
  userStore.setRecordedDaysCount(new Set(expenses.map((e) => expenseLocalDate(e))).size);
  userStore.setStreak(computeRecordingStreak(expenses, todayStr));
  userStore.setTotalRecordCount(expenses.length);
}

// Edit a record. Optimistic in memory, then the write is awaited. On storage
// failure the prior expenses array is restored (immutable store updates keep
// the old reference intact) so the UI can't show a phantom edit that vanishes
// on the next launch. Returns durability success. Editing amount/category/memo
// never changes recordedDays/streak/total, so user state is untouched.
export async function updateExpense(
  id: string,
  patch: { amount: number; category: ExpenseCategory; memo?: string; kind: RecordKind },
): Promise<boolean> {
  const store = useExpenseStore.getState();
  const prevExpenses = store.expenses;
  if (!prevExpenses.some((e) => e.id === id)) return false;

  store.updateExpense(id, patch);
  const saved = await storageService.save(STORAGE_KEYS.EXPENSES, useExpenseStore.getState().expenses);
  if (!saved) {
    useExpenseStore.getState().hydrate(prevExpenses);
    return false;
  }
  return true;
}

// Delete a record. Optimistic remove + derived-state recompute, then the write
// is awaited. On storage failure both the records and the prior derived
// counters are restored, so a failed delete leaves no phantom-removed record.
// Returns durability success.
export async function deleteExpense(id: string): Promise<boolean> {
  const prevExpenses = useExpenseStore.getState().expenses;
  if (!prevExpenses.some((e) => e.id === id)) return false;
  const prevUser = buildUserSnapshot();

  removeExpenseFromState(id);
  const expenses = useExpenseStore.getState().expenses;
  const updatedUser = buildUserSnapshot();

  const saved = await storageService.save(STORAGE_KEYS.EXPENSES, expenses);
  if (!saved) {
    useExpenseStore.getState().hydrate(prevExpenses);
    const us = useUserStore.getState();
    us.setRecordedDaysCount(prevUser.recordedDaysCount);
    us.setStreak(prevUser.streak);
    us.setTotalRecordCount(prevUser.totalRecordCount);
    return false;
  }
  // USER write is non-fatal — derived state self-heals from EXPENSES at init.
  await storageService.save(STORAGE_KEYS.USER, updatedUser);
  return true;
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
