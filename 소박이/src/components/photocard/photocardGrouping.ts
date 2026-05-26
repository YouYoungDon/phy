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

export interface VisibleRecords {
  spending: PhotocardRecord[];
  income: PhotocardRecord[];
  noSpend: PhotocardRecord[];
  overflowCount: number;
}

/**
 * Pure. Groups records, then takes across groups in fixed order
 * (spending → income → noSpend) up to `limit` total rows. `overflowCount`
 * is how many records didn't make the visible cut from any group.
 */
export function selectVisibleRecords(
  records: readonly PhotocardRecord[],
  limit: number,
): VisibleRecords {
  const groups = groupByKind(records);
  let remaining = Math.max(0, limit);
  const take = (arr: readonly PhotocardRecord[]): PhotocardRecord[] => {
    const slice = arr.slice(0, remaining);
    remaining -= slice.length;
    return slice;
  };
  const spending = take(groups.spending);
  const income = take(groups.income);
  const noSpend = take(groups.noSpend);
  const shownTotal = spending.length + income.length + noSpend.length;
  const overflowCount = Math.max(0, records.length - shownTotal);
  return { spending, income, noSpend, overflowCount };
}
