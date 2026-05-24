import { RecordKind } from '../../types';

/**
 * Runtime shape passed into PhotocardView for each line item.
 * Independent of the storage Expense shape — `category` is optional
 * because some callers (test fixtures, future surfaces) may construct
 * synthetic records without a category token. Grouping uses both
 * `kind` and `category` defensively.
 */
export type PhotocardRecord = {
  id?: string;
  category?: string;
  categoryLabel?: string;
  amount: number;
  memo?: string;
  /**
   * Optional. When omitted, the amount column always renders (legacy
   * behavior). When set to 'income' and amount is 0, the amount column
   * is hidden — preserves sub-spec A's per-record amount-hide rule.
   */
  kind?: RecordKind;
};

export interface PhotocardGroups {
  spending: PhotocardRecord[];
  income: PhotocardRecord[];
  noSpend: PhotocardRecord[];
}

/**
 * Pure. Splits records into the three photocard groups.
 *
 * Rules (mirror sub-spec B design §4.1):
 *   - 무지출: category === 'no_spend' (regardless of kind)
 *   - 들어온: kind === 'income'
 *   - 쓴:    everything else
 *
 * Records without an explicit kind fall into 쓴 (legacy in-memory data
 * predating sub-spec A normalize). This is the spec's intended fallback.
 */
export function groupByKind(records: readonly PhotocardRecord[]): PhotocardGroups {
  const spending: PhotocardRecord[] = [];
  const income: PhotocardRecord[] = [];
  const noSpend: PhotocardRecord[] = [];
  for (const r of records) {
    if (r.category === 'no_spend') {
      noSpend.push(r);
    } else if (r.kind === 'income') {
      income.push(r);
    } else {
      spending.push(r);
    }
  }
  return { spending, income, noSpend };
}

/**
 * Pure. Whether a record's amount column should render on the photocard.
 *   - no_spend: never — it's a presence marker, not a money line (no ₩0).
 *   - income with amount 0: hidden (sub-spec A per-record amount-hide rule).
 *   - everything else: shown.
 */
export function showsAmount(r: PhotocardRecord): boolean {
  if (r.category === 'no_spend') return false;
  return r.kind !== 'income' || r.amount > 0;
}
