// Pure helper for the Stats calendar cell amount/marker slot. Maps the active
// view mode + a day's spending/income shape to a render descriptor. No React,
// no SDK — unit-testable. The 'spending' branch reproduces the pre-toggle
// behavior byte-for-byte (income-only & no-spend days → 🌿).
export type CalendarViewMode = 'spending' | 'income' | 'both';

export type CellDisplay =
  | { kind: 'blank' }
  | { kind: 'leaf' }                              // 🌿 quiet / no-spend day
  | { kind: 'amount'; amount: number; compact?: boolean };  // spending (쓴 기록), compact 만 income (들어온 기록), or combined movement (함께)

export function selectCalendarCellContent(
  mode: CalendarViewMode,
  d: { spendingTotal: number; incomeTotal: number; hasRecord: boolean },
): CellDisplay {
  if (mode === 'income') {
    // Income amounts (esp. salary) are large; compact to 만 units so they never
    // truncate in the ~50px cell. Spending cells keep full numbers.
    return d.incomeTotal > 0 ? { kind: 'amount', amount: d.incomeTotal, compact: true } : { kind: 'blank' };
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

// Compact 만-unit label for space-constrained income cells (들어온 기록 view).
// >= 10000 → 만 with up to one decimal (3,000,000 → "300만", 72,000 → "7.2만");
// below that the value is ≤ 4 digits and shown as-is. Pure; no toLocaleString
// so it's deterministic under the test runner.
export function formatCompactAmount(n: number): string {
  if (n >= 10000) {
    const man = Math.round((n / 10000) * 10) / 10;
    return `${man}만`;
  }
  return String(n);
}
