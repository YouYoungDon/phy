// Pure helper for the Stats calendar cell amount/marker slot. Maps the active
// view mode + a day's spending/income shape to a render descriptor. No React,
// no SDK — unit-testable. The 'spending' branch reproduces the pre-toggle
// behavior byte-for-byte (income-only & no-spend days → 🌿).
export type CalendarViewMode = 'spending' | 'income' | 'both';

export type CellDisplay =
  | { kind: 'blank' }
  | { kind: 'leaf' }                 // 🌿 quiet / no-spend day
  | { kind: 'amount'; amount: number };  // spending (쓴 기록), income (들어온 기록), or combined movement (함께) — all full comma

export function selectCalendarCellContent(
  mode: CalendarViewMode,
  d: { spendingTotal: number; incomeTotal: number; hasRecord: boolean },
): CellDisplay {
  if (mode === 'income') {
    // 들어온 기록 — income total as a full comma-formatted number (same as the
    // spending and 함께 views). Days with no income → blank.
    return d.incomeTotal > 0 ? { kind: 'amount', amount: d.incomeTotal } : { kind: 'blank' };
  }
  if (mode === 'both') {
    // 함께 보기 — one calm combined-movement number (spending + income, full
    // comma). NOT net/balance: the absolute sum of "how much moved today".
    // No-spend-only (combined 0) stays 🌿; no record stays blank.
    if (!d.hasRecord) return { kind: 'blank' };
    const combined = d.spendingTotal + d.incomeTotal;
    return combined > 0 ? { kind: 'amount', amount: combined } : { kind: 'leaf' };
  }
  // 'spending' (default) — byte-identical to current behavior
  if (!d.hasRecord) return { kind: 'blank' };
  return d.spendingTotal === 0 ? { kind: 'leaf' } : { kind: 'amount', amount: d.spendingTotal };
}
