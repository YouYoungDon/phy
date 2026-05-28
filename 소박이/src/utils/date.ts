// Returns 'YYYY-MM-DD' in device local timezone.
// Never use toISOString() for date grouping — it returns UTC.
export function getLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Builds an ISO string anchored to noon local time for a YYYY-MM-DD string.
// Use for past-date expenses so getLocalDateString always resolves to the chosen date.
export function localDateToISOString(localDateStr: string): string {
  const parts = localDateStr.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

// Returns a record's local calendar date (YYYY-MM-DD). Prefers the stored
// `localDate` captured at creation; falls back to deriving from `createdAt`
// (UTC) in the device's *current* timezone for legacy records that predate
// the field. For non-traveling users the two are identical by construction,
// so routing all day-grouping through this helper is behavior-preserving —
// it only stabilizes a record's day across timezone changes for records
// created after `localDate` was introduced.
export function expenseLocalDate(e: { localDate?: string; createdAt: string }): string {
  return e.localDate ?? getLocalDateString(new Date(e.createdAt));
}

// Korean-format short date — "5월 26일" — for the home today-surface overlay. Plain
// non-padded numbers (no leading zeros), matching how Korean dates are written in
// everyday memo / handwritten contexts. Pure: no locale config, no Intl.
export function formatKoreanMonthDay(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}
