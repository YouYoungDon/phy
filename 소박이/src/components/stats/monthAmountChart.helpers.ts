// Pure helpers for MonthAmountChart. No React Native imports — keep unit-testable.

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
