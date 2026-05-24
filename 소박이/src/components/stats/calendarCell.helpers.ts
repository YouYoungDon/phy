// Pure helper for the Stats calendar cell amount/marker slot. Maps the active
// view mode + a day's spending/income shape to a render descriptor. No React,
// no SDK — unit-testable. The 'spending' branch reproduces the pre-toggle
// behavior byte-for-byte (income-only & no-spend days → 🌿).
export type CalendarViewMode = 'spending' | 'income' | 'both';

export type CellDisplay =
  | { kind: 'blank' }
  | { kind: 'leaf' }                              // 🌿 quiet / no-spend day
  | { kind: 'amount'; amount: number }            // spending in 쓴 기록, income in 들어온 기록
  | { kind: 'amountWithIncome'; amount: number }  // 함께: spending amount + 🍃 marker
  | { kind: 'incomeMarker' };                     // 함께: income existed, no spending → 🍃

export function selectCalendarCellContent(
  mode: CalendarViewMode,
  d: { spendingTotal: number; incomeTotal: number; hasRecord: boolean },
): CellDisplay {
  if (mode === 'income') {
    return d.incomeTotal > 0 ? { kind: 'amount', amount: d.incomeTotal } : { kind: 'blank' };
  }
  if (mode === 'both') {
    if (!d.hasRecord) return { kind: 'blank' };
    if (d.spendingTotal > 0) {
      return d.incomeTotal > 0
        ? { kind: 'amountWithIncome', amount: d.spendingTotal }
        : { kind: 'amount', amount: d.spendingTotal };
    }
    return d.incomeTotal > 0 ? { kind: 'incomeMarker' } : { kind: 'leaf' };
  }
  // 'spending' (default) — byte-identical to current behavior
  if (!d.hasRecord) return { kind: 'blank' };
  return d.spendingTotal === 0 ? { kind: 'leaf' } : { kind: 'amount', amount: d.spendingTotal };
}
