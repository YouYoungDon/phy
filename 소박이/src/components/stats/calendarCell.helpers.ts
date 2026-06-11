// Pure helper for the Stats calendar cell amount/marker slot. Maps the active
// view mode + a day's spending/income shape to a render descriptor. No React,
// no SDK — unit-testable.
//
// Flow is carried on each value so the selected view can keep its meaning, but
// cells deliberately avoid +/- and red/blue ledger language. 함께 보기 shows one
// calm movement number (income + spending), not net/balance.
export type CalendarViewMode = 'spending' | 'income' | 'both';

export type CellFlow = 'spending' | 'income' | 'movement';

export type CellDisplay =
  | { kind: 'blank' }
  | { kind: 'leaf' }                                       // 🌿 quiet / no-spend day
  | { kind: 'amount'; amount: number; flow: CellFlow };    // one quiet value, view-scoped

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
    // 함께 보기 — show the day's money movement as a single absolute sum. It is
    // NOT net/balance: income and spending are added only to show that the day
    // had movement. No record → blank; no-spend only → 🌿.
    if (!d.hasRecord) return { kind: 'blank' };
    if (d.spendingTotal === 0 && d.incomeTotal === 0) return { kind: 'leaf' };
    return { kind: 'amount', amount: d.spendingTotal + d.incomeTotal, flow: 'movement' };
  }
  // 'spending' (default) — spending total; income-only & no-spend days → 🌿.
  if (!d.hasRecord) return { kind: 'blank' };
  return d.spendingTotal === 0 ? { kind: 'leaf' } : { kind: 'amount', amount: d.spendingTotal, flow: 'spending' };
}
