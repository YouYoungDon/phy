import { Expense, ExpenseCategory } from '../types';
import * as storageService from './storageService';
import { STORAGE_KEYS } from '../constants/storage';

// Legacy tokens that may still exist in stored Expense records. Mapped to
// the closest life-scene token. See spec:
// docs/superpowers/specs/2026-05-19-life-scene-categories-design.md
const LEGACY_CATEGORY_MAP: Record<string, ExpenseCategory> = {
  food: 'dining_out',
  shopping: 'living',
  other: 'living',
};

/**
 * Pure. Returns a new array (with remapped categories) when any record is
 * legacy-tagged, otherwise returns the input by reference. Idempotent.
 */
export function migrateExpenseCategories(expenses: Expense[]): Expense[] {
  let changed = false;
  const next = expenses.map((e) => {
    const remapped = LEGACY_CATEGORY_MAP[e.category as string];
    if (remapped !== undefined) {
      changed = true;
      return { ...e, category: remapped };
    }
    return e;
  });
  return changed ? next : expenses;
}

/**
 * Runs migration once per install. Idempotent — safe to call repeatedly.
 * Awaits before any consumer reads STORAGE_KEYS.EXPENSES.
 */
export async function runExpenseCategoryMigration(): Promise<void> {
  const done = await storageService.load<boolean>(STORAGE_KEYS.CATEGORY_MIGRATION_DONE);
  if (done === true) return;

  const expenses = await storageService.load<Expense[]>(STORAGE_KEYS.EXPENSES);
  if (expenses && expenses.length > 0) {
    const migrated = migrateExpenseCategories(expenses);
    if (migrated !== expenses) {
      await storageService.save(STORAGE_KEYS.EXPENSES, migrated);
    }
  }
  await storageService.save(STORAGE_KEYS.CATEGORY_MIGRATION_DONE, true);
}
