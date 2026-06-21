// Pure helper for the Stats calendar cell amount/marker slot. Maps the active
// view mode + a day's spending/income shape to a render descriptor. No React,
// no SDK — unit-testable.
//
// Flow is carried on each value so the cell can colour + sign it: income is red
// with a leading '+', spending is blue with a leading '−' (a deliberate
// finance-app direction). 함께 보기 shows the two SEPARATELY (a +income line and
// a −spending line) rather than a combined sum, so the day's two flows stay
// distinguishable.
export type CalendarViewMode = 'spending' | 'income' | 'both';

export type CellFlow = 'spending' | 'income';

export type CellDisplay =
  | { kind: 'blank' }
  | { kind: 'leaf' }                                       // 🌿 quiet / no-spend day
  | { kind: 'incomeMark' }                                 // spending view, income-only day → a small + (not an empty 🌿)
  | { kind: 'amount'; amount: number; flow: CellFlow }     // one signed/coloured value
  | { kind: 'both'; spending: number; income: number };    // both flows; a 0 side is omitted in render

// Compact amount for the tiny calendar cell ONLY — keeps large income / mixed
// days from clipping on small screens. Under 만 (10,000) the full comma number
// reads fine; at or above it we switch to 만 units with at most one decimal
// (34,000 → "3.4만", 1,200,000 → "120만"), trailing ".0" trimmed. No sign and no
// "원" — the cell prepends the +/− itself. Exact won values stay full-precision
// in the selected-day card, edit sheet, and record list.
export function formatCalendarAmount(amount: number): string {
  const n = Math.abs(amount);
  if (n < 10000) return n.toLocaleString('ko-KR');
  const man = n / 10000;
  return `${man.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만`;
}

export function selectCalendarCellContent(
  mode: CalendarViewMode,
  d: { spendingTotal: number; incomeTotal: number; hasRecord: boolean },
): CellDisplay {
  if (mode === 'income') {
    // 들어온 기록 — income total only. Days with no income → blank.
    return d.incomeTotal > 0 ? { kind: 'amount', amount: d.incomeTotal, flow: 'income' } : { kind: 'blank' };
  }
  if (mode === 'both') {
    // 함께 보기 — show the day's income (+, red) and spending (−, blue) as two
    // separate values, not a combined sum. No record → blank; a day with no
    // money movement (no-spend only) → 🌿.
    if (!d.hasRecord) return { kind: 'blank' };
    if (d.spendingTotal === 0 && d.incomeTotal === 0) return { kind: 'leaf' };
    return { kind: 'both', spending: d.spendingTotal, income: d.incomeTotal };
  }
  // 'spending' (default) — spending total. A day with no spending but some
  // income shows a small + (incomeMark) so a salary day reads as "money came
  // in," not as an empty 🌿; a truly quiet / no-spend day stays 🌿.
  if (!d.hasRecord) return { kind: 'blank' };
  if (d.spendingTotal > 0) return { kind: 'amount', amount: d.spendingTotal, flow: 'spending' };
  if (d.incomeTotal > 0) return { kind: 'incomeMark' };
  return { kind: 'leaf' };
}
