// Pure helpers for MonthAmountChart. No React Native imports — keep unit-testable.

/**
 * Compact amount label for the y-axis (only ever formats maxTotal, midTotal, 0).
 *   0            → "0"
 *   >= 10000     → 만 units, one decimal, trailing .0 dropped (40000 → "4만", 72000 → "7.2만")
 *   0 < n <10000 → nearest 천 (8000 → "8천", 5400 → "5천")
 */
export function fmtAmt(n: number): string {
  if (n <= 0) return '0';
  if (n >= 10000) return `${Math.round(n / 1000) / 10}만`;
  return `${Math.round(n / 1000)}천`;
}

/**
 * Pixel height of a day's spending bar.
 *   total <= 0       → 0 (baseline, the component renders a faint empty tick instead)
 *   maxTotal <= 0    → 0 (divide-by-zero guard)
 *   otherwise        → round(total/maxTotal * barMax), floored at minBar, capped at barMax
 */
export function barHeightFor(total: number, maxTotal: number, barMax: number, minBar: number): number {
  if (total <= 0 || maxTotal <= 0) return 0;
  const raw = Math.round((total / maxTotal) * barMax);
  return Math.min(Math.max(raw, minBar), barMax);
}

/**
 * Largest daily spending total within the view month. 0 if the month has no
 * spending (drives the empty-state branch). Only considers days 1..daysInMonth.
 */
export function selectMaxTotal(
  expensesByDate: Record<string, { total: number }>,
  viewYear: number,
  viewMonth: number,
  daysInMonth: number,
): number {
  let max = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const total = expensesByDate[dateStr]?.total ?? 0;
    if (total > max) max = total;
  }
  return max;
}
