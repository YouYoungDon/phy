import { ExpenseCategory, RecordKind } from '../types';

// The category an income record starts on when the user toggles to the
// 들어온 기록 tab. Used as the "untouched default" signal for intent detection.
export const INCOME_DEFAULT_CATEGORY: ExpenseCategory = 'salary';

/**
 * Pure. Whether an income record carries at least one signal of user intent.
 * Income amount is intentionally optional (a quiet "something came in" log),
 * but a completely default record — salary + amount 0 + no memo + no emotion —
 * is almost always an accidental save and should be blocked.
 *
 * Intent = any one of:
 *   - amount > 0
 *   - a non-blank memo
 *   - a userEmotion selected
 *   - category changed from the default (salary)
 */
export function incomeRecordHasIntent(p: {
  amount: number;
  memo: string;
  userEmotion?: string;
  category: ExpenseCategory;
}): boolean {
  return (
    p.amount > 0 ||
    p.memo.trim().length > 0 ||
    p.userEmotion !== undefined ||
    p.category !== INCOME_DEFAULT_CATEGORY
  );
}

/**
 * Pure. Shared amount-validity rule for create and edit. Spending must be a
 * positive amount (a spending record is only meaningful when there's something
 * to record); income may be 0 (the amount is optional). Assumes `amount` is a
 * clean non-negative integer from `parseAmountInput`.
 */
export function amountValidForKind(kind: RecordKind, amount: number): boolean {
  return kind === 'income' ? amount >= 0 : amount > 0;
}
