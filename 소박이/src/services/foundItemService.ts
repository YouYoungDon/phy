import { Expense } from '../types';
import { FINDABLE_ITEMS } from '../constants/findableItems';
import { STORAGE_KEYS } from '../constants/storage';
import * as storageService from './storageService';
import { getLocalDateString, expenseLocalDate } from '../utils/date';

const COOLDOWN_DAYS = 3;
const GRACE_DAYS = 3;

function calendarDaysBetween(laterStr: string, earlierStr: string): number {
  const later = new Date(laterStr + 'T12:00:00');
  const earlier = new Date(earlierStr + 'T12:00:00');
  return Math.round((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
}

function daysSince(dateStr: string): number {
  return calendarDaysBetween(getLocalDateString(new Date()), dateStr);
}

function hasTrigger(expenses: Expense[], today: string, yesterday: string): boolean {
  const todayExpenses = expenses.filter(
    (e) => expenseLocalDate(e) === today,
  );
  const yesterdayExpenses = expenses.filter(
    (e) => expenseLocalDate(e) === yesterday,
  );
  const recentExpenses = [...todayExpenses, ...yesterdayExpenses];

  if (recentExpenses.length === 0) return false;

  // T1: First record after a 3+ day gap
  if (todayExpenses.length > 0) {
    const priorExpenses = expenses.filter(
      (e) => expenseLocalDate(e) < today,
    );
    if (priorExpenses.length > 0) {
      const lastPriorDate = priorExpenses.reduce<string>((latest, e) => {
        const d = expenseLocalDate(e);
        return d > latest ? d : latest;
      }, '');
      if (calendarDaysBetween(today, lastPriorDate) >= 3) return true;
    }
  }

  // T2: First recorded day of a new month
  if (todayExpenses.length > 0) {
    const monthPrefix = today.slice(0, 7);
    const otherDaysThisMonth = new Set(
      expenses
        .filter((e) => {
          const d = expenseLocalDate(e);
          return d.startsWith(monthPrefix) && d !== today;
        })
        .map((e) => expenseLocalDate(e)),
    );
    if (otherDaysThisMonth.size === 0) return true;
  }

  // T3: Yesterday was a quiet day — exactly one record. Activity-based, not
  // amount-based: we react to the shape of yesterday's presence (one quiet
  // touchpoint), never to how little the user spent. No-spend records count
  // here the same as a single small purchase would.
  if (yesterdayExpenses.length === 1) return true;

  // T4: Small everyday purchase (cafe / home_meal / dining_out under 6,000 won)
  if (
    recentExpenses.some(
      (e) => (e.category === 'cafe' || e.category === 'home_meal' || e.category === 'dining_out') && e.amount < 6000,
    )
  )
    return true;

  return false;
}

// Called on app open — promotes a staged item to pending if it was staged on a previous day.
export async function promoteStaged(): Promise<void> {
  const staged = await storageService.load<string>(STORAGE_KEYS.STAGED_ITEM_ID);
  if (staged == null) return;

  const lastItemDate = await storageService.load<string>(STORAGE_KEYS.LAST_ITEM_DATE);
  const today = getLocalDateString(new Date());
  if (lastItemDate === today) return;

  const pending = await storageService.load<string>(STORAGE_KEYS.PENDING_NEW_ITEM_ID);
  if (pending != null) return;

  await storageService.save(STORAGE_KEYS.PENDING_NEW_ITEM_ID, staged);
  await storageService.save(STORAGE_KEYS.STAGED_ITEM_ID, null);
}

// Called on app open — checks trigger conditions and stages an item quietly if appropriate.
export async function checkForFoundItem(
  expenses: Expense[],
  recordedDaysCount: number,
): Promise<void> {
  const pending = await storageService.load<string>(STORAGE_KEYS.PENDING_NEW_ITEM_ID);
  if (pending != null) return;

  const staged = await storageService.load<string>(STORAGE_KEYS.STAGED_ITEM_ID);
  if (staged != null) return;

  if (recordedDaysCount < GRACE_DAYS) return;

  const lastItemDate = await storageService.load<string>(STORAGE_KEYS.LAST_ITEM_DATE);
  if (lastItemDate != null && daysSince(lastItemDate) < COOLDOWN_DAYS) return;

  const foundIds = (await storageService.load<string[]>(STORAGE_KEYS.FOUND_ITEM_IDS)) ?? [];
  // New first, repeats later: always prefer trinkets the user hasn't discovered yet.
  // Only once every trinket has turned up at least once does the pool open to owned
  // ones, so a gentle re-find (the ×N trace) becomes possible. The same GRACE/COOLDOWN
  // gating below still applies to re-finds — they can't be farmed.
  const undiscovered = FINDABLE_ITEMS.filter((item) => !foundIds.includes(item.id));
  const pool = undiscovered.length > 0 ? undiscovered : FINDABLE_ITEMS;

  const now = new Date();
  const today = getLocalDateString(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateString(yesterdayDate);

  if (!hasTrigger(expenses, today, yesterday)) return;

  const item = pool[Math.floor(Math.random() * pool.length)];
  if (!item) return;

  await storageService.save(STORAGE_KEYS.STAGED_ITEM_ID, item.id);
  await storageService.save(STORAGE_KEYS.LAST_ITEM_DATE, today);
}
